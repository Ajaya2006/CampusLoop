import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { USER_KEY, tokenStore } from '../services/api';
import { authService } from '../services';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

/* Session policy ------------------------------------------------------------
   A signed-in tab ends on its own after 30 minutes without interaction, and
   never lasts longer than 12 hours regardless of activity. The timestamps live
   in localStorage so several tabs agree on the same deadline. */
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;
const WARN_BEFORE_MS = 60 * 1000;
const CHECK_EVERY_MS = 10 * 1000;

const LAST_ACTIVE_KEY = 'campusloop.lastActive';
const SESSION_START_KEY = 'campusloop.sessionStart';
export const SESSION_NOTICE_KEY = 'campusloop.sessionNotice';

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function stampSession() {
  const now = Date.now();
  localStorage.setItem(LAST_ACTIVE_KEY, String(now));
  localStorage.setItem(SESSION_START_KEY, String(now));
}

function touchActivity() {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser);
  const [booting, setBooting] = useState(Boolean(tokenStore.access));
  const toast = useToast();
  const warnedRef = useRef(false);
  const lastTouchRef = useRef(0);
  const endingRef = useRef(false);

  const persistUser = useCallback((next) => {
    setUser(next);
    if (next) localStorage.setItem(USER_KEY, JSON.stringify(next));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenStore.access) {
      persistUser(null);
      return null;
    }
    try {
      const me = await authService.me();
      persistUser(me);
      return me;
    } catch {
      return null;
    }
  }, [persistUser]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!tokenStore.access) {
        setBooting(false);
        return;
      }

      /* Reloading does not revive a session that already timed out. */
      const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY)) || 0;
      if (lastActive && Date.now() - lastActive >= IDLE_LIMIT_MS) {
        tokenStore.clear();
        localStorage.removeItem(LAST_ACTIVE_KEY);
        localStorage.removeItem(SESSION_START_KEY);
        sessionStorage.setItem(
          SESSION_NOTICE_KEY,
          'You were signed out after 30 minutes of inactivity. Please sign in again.',
        );
        if (active) {
          persistUser(null);
          setBooting(false);
        }
        return;
      }

      try {
        const me = await authService.me();
        if (active) persistUser(me);
      } catch {
        tokenStore.clear();
        if (active) persistUser(null);
      } finally {
        if (active) setBooting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [persistUser]);

  useEffect(() => {
    const onExpired = () => {
      persistUser(null);
      toast.info('Session expired', 'Please sign in again to continue.');
    };
    window.addEventListener('campusloop:session-expired', onExpired);
    return () => window.removeEventListener('campusloop:session-expired', onExpired);
  }, [persistUser, toast]);

  /* Signing out in one tab signs this one out too. */
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'campusloop.access' && !event.newValue) persistUser(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [persistUser]);

  /* Keep a live deadline per signed-in user (old sessions get a full window). */
  useEffect(() => {
    if (!user) {
      warnedRef.current = false;
      return;
    }
    if (!localStorage.getItem(SESSION_START_KEY)) stampSession();
    if (!localStorage.getItem(LAST_ACTIVE_KEY)) stampSession();
  }, [user]);

  /* Record interaction, throttled so scrolling does not thrash localStorage. */
  useEffect(() => {
    if (!user) return undefined;

    /* Browsers can emit phantom mousemove events at the same coordinates;
       those must not keep an abandoned session alive. */
    const lastPoint = { x: -1, y: -1 };
    const onActivity = (event) => {
      if (event?.type === 'mousemove') {
        if (Math.abs(event.clientX - lastPoint.x) < 3 && Math.abs(event.clientY - lastPoint.y) < 3) return;
        lastPoint.x = event.clientX;
        lastPoint.y = event.clientY;
      }
      const now = Date.now();
      if (now - lastTouchRef.current < 5000) return;
      lastTouchRef.current = now;
      touchActivity();
      warnedRef.current = false;
    };

    const events = ['mousemove', 'pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));

    const onVisible = () => {
      if (document.visibilityState === 'visible') onActivity({ type: 'visible' });
    };
    document.addEventListener('visibilitychange', onVisible);

    const onStorage = (event) => {
      if (event.key === LAST_ACTIVE_KEY) lastTouchRef.current = Date.now();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      events.forEach((name) => window.removeEventListener(name, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, [user]);

  /* The clock itself: warn once, then sign out on idle or on the hard cap. */
  const endSession = useCallback(
    async (reason) => {
      if (endingRef.current) return;
      endingRef.current = true;
      const message =
        reason === 'idle'
          ? 'You were signed out after 30 minutes of inactivity.'
          : 'You were signed out because the session reached its 12 hour limit.';
      try {
        await authService.logout();
      } catch {
        /* server unreachable is fine, local tokens are cleared below */
      }
      tokenStore.clear();
      localStorage.removeItem(LAST_ACTIVE_KEY);
      localStorage.removeItem(SESSION_START_KEY);
      sessionStorage.setItem(SESSION_NOTICE_KEY, message);
      persistUser(null);
      toast.info('Signed out', message);
      window.setTimeout(() => {
        endingRef.current = false;
      }, 2000);
    },
    [persistUser, toast],
  );

  useEffect(() => {
    if (!user) return undefined;

    const tick = () => {
      const now = Date.now();
      const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY)) || now;
      const startedAt = Number(localStorage.getItem(SESSION_START_KEY)) || now;
      const idleFor = now - lastActive;
      const sessionFor = now - startedAt;

      if (sessionFor >= MAX_SESSION_MS) {
        endSession('length');
        return;
      }
      if (idleFor >= IDLE_LIMIT_MS) {
        endSession('idle');
        return;
      }
      if (!warnedRef.current && idleFor >= IDLE_LIMIT_MS - WARN_BEFORE_MS) {
        warnedRef.current = true;
        toast.info('Still there?', 'You will be signed out in one minute unless you interact.');
      }
    };

    const timer = window.setInterval(tick, CHECK_EVERY_MS);
    const onWake = () => tick();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    tick();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [user, endSession, toast]);

  const login = useCallback(
    async (credentials) => {
      const data = await authService.login(credentials);
      tokenStore.set(data);
      stampSession();
      persistUser(data.user);
      return data.user;
    },
    [persistUser],
  );

  const register = useCallback(
    async (payload) => {
      const data = await authService.register(payload);
      tokenStore.set(data);
      stampSession();
      persistUser(data.user);
      return data.user;
    },
    [persistUser],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    tokenStore.clear();
    localStorage.removeItem(LAST_ACTIVE_KEY);
    localStorage.removeItem(SESSION_START_KEY);
    persistUser(null);
  }, [persistUser]);

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isVerified: user?.verification_status === 'verified' || user?.role === 'admin',
      login,
      register,
      logout,
      refreshUser,
      setUser: persistUser,
    }),
    [user, booting, login, register, logout, refreshUser, persistUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
