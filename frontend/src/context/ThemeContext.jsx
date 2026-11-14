import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isDaylight, isDaylightByClock, sunTimes } from '../utils/sun';

const ThemeContext = createContext(null);
/* New key so existing installs pick up day/night-on-auto instead of a stale
   light/dark value chosen before the theme followed the sun. */
const MODE_KEY = 'campusloop.themeMode';
const GEO_KEY = 'campusloop.geo';
const AUTO_TICK_MS = 60 * 1000;

function readGeo() {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat !== 'number' || typeof parsed?.lon !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(mode, { geo, at, systemDark }) {
  if (mode === 'light' || mode === 'dark') return mode;
  if (mode === 'system') return systemDark ? 'dark' : 'light';
  /* auto: follow the real sun where the user is, local clock without it */
  const daylight = geo ? isDaylight(at, geo.lat, geo.lon) : isDaylightByClock(at);
  return daylight ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(MODE_KEY) || 'auto');
  const [geo, setGeo] = useState(readGeo);
  const [tick, setTick] = useState(() => Date.now());
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  /* The auto theme moves with the sun, so it needs a heartbeat. */
  useEffect(() => {
    if (theme !== 'auto') return undefined;
    const refresh = () => setTick(Date.now());
    const timer = window.setInterval(refresh, AUTO_TICK_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [theme]);

  const at = useMemo(() => new Date(tick), [tick]);
  const resolved = resolveTheme(theme, { geo, at, systemDark });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
    document.documentElement.dataset.themeMode = theme;
  }, [resolved, theme]);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    setTick(Date.now());
  }, []);

  const requestGeolocation = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              at: Date.now(),
            };
            localStorage.setItem(GEO_KEY, JSON.stringify(next));
            setGeo(next);
            setTick(Date.now());
            resolve(next);
          },
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 },
        );
      }),
    [],
  );

  const daylightWindow = useMemo(() => {
    if (!geo) return null;
    const times = sunTimes(at, geo.lat, geo.lon);
    return times.polar ? { polar: times.polar } : times;
  }, [geo, at]);

  const value = useMemo(
    () => ({
      theme,
      resolved,
      setTheme,
      toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
      geo,
      requestGeolocation,
      daylightWindow,
      followingSun: theme === 'auto',
    }),
    [theme, resolved, setTheme, geo, requestGeolocation, daylightWindow],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
