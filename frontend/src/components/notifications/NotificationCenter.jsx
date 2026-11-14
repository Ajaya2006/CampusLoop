import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  Flag,
  HandCoins,
  MessageCircle,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tag,
  X,
  XCircle,
} from 'lucide-react';
import { notificationService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { cx } from '../../utils/format';
import { playNotificationSound, primeNotificationAudio } from '../../utils/notificationSounds';

const POLL_MS = 12000;
const POPUP_MS = 9000;
const EXIT_MS = 220;

const META = {
  listing_approved: { icon: CheckCircle2, tone: 'success', label: 'Listing update' },
  listing_rejected: { icon: XCircle, tone: 'danger', label: 'Listing update' },
  listing_removed: { icon: XCircle, tone: 'danger', label: 'Listing update' },
  listing_pending: { icon: Clock, tone: 'warning', label: 'Listing update' },
  new_listing: { icon: Tag, tone: 'warning', label: 'Listing review' },
  new_message: { icon: MessageCircle, tone: 'info', label: 'New message' },
  new_offer: { icon: HandCoins, tone: 'warning', label: 'New offer' },
  counteroffer: { icon: HandCoins, tone: 'warning', label: 'Counteroffer' },
  offer_accepted: { icon: CheckCircle2, tone: 'success', label: 'Offer update' },
  offer_rejected: { icon: XCircle, tone: 'danger', label: 'Offer update' },
  meeting_proposed: { icon: CalendarClock, tone: 'warning', label: 'Meeting' },
  meeting_rescheduled: { icon: CalendarClock, tone: 'warning', label: 'Meeting' },
  meeting_confirmed: { icon: CalendarCheck, tone: 'success', label: 'Meeting' },
  meeting_cancelled: { icon: CalendarX, tone: 'danger', label: 'Meeting' },
  transaction_started: { icon: ReceiptText, tone: 'info', label: 'Transaction' },
  transaction_confirmation: { icon: Clock, tone: 'warning', label: 'Transaction' },
  transaction_completed: { icon: BadgeCheck, tone: 'success', label: 'Transaction' },
  transaction_cancelled: { icon: XCircle, tone: 'danger', label: 'Transaction' },
  new_report: { icon: Flag, tone: 'danger', label: 'New report' },
  report_updated: { icon: ShieldCheck, tone: 'info', label: 'Report update' },
  new_review: { icon: Star, tone: 'warning', label: 'New review' },
  verification_submitted: { icon: ShieldCheck, tone: 'info', label: 'Verification' },
  verification_approved: { icon: BadgeCheck, tone: 'success', label: 'Verification' },
  verification_rejected: { icon: ShieldAlert, tone: 'danger', label: 'Verification' },
};

const TONES = {
  success: 'border-success/30',
  danger: 'border-danger/30',
  warning: 'border-warning/30',
  info: 'border-accent/30',
};

const ICON_TONES = {
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300',
};

function metaFor(type) {
  return META[type] || { icon: Bell, tone: 'info', label: 'Notification' };
}

export default function NotificationCenter() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [popups, setPopups] = useState([]);
  const [leaving, setLeaving] = useState([]);
  const seen = useRef(new Set());
  const syncedUser = useRef(null);
  const timers = useRef({});

  const clearTimer = useCallback((key) => {
    if (!timers.current[key]) return;
    clearTimeout(timers.current[key]);
    delete timers.current[key];
  }, []);

  const remove = useCallback(
    (id) => {
      setPopups((current) => current.filter((item) => item.id !== id));
      setLeaving((current) => current.filter((currentId) => currentId !== id));
      clearTimer(id);
      clearTimer(`exit-${id}`);
    },
    [clearTimer],
  );

  const dismiss = useCallback(
    (id) => {
      clearTimer(id);
      setLeaving((current) => (current.includes(id) ? current : [...current, id]));
      clearTimer(`exit-${id}`);
      timers.current[`exit-${id}`] = setTimeout(() => remove(id), EXIT_MS);
    },
    [clearTimer, remove],
  );

  const show = useCallback(
    (items) => {
      const incoming = items.filter((item) => !item.is_read).slice(0, 3);
      if (!incoming.length) return;

      setPopups((current) => [...current, ...incoming].slice(-3));
      incoming.forEach((item) => {
        clearTimer(item.id);
        timers.current[item.id] = setTimeout(() => dismiss(item.id), POPUP_MS);
      });
      playNotificationSound(incoming[0].type);
    },
    [clearTimer, dismiss],
  );

  useEffect(() => {
    const unlock = () => primeNotificationAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setPopups([]);
      setLeaving([]);
      seen.current.clear();
      syncedUser.current = null;
      Object.values(timers.current).forEach((timer) => clearTimeout(timer));
      timers.current = {};
      return undefined;
    }

    let active = true;

    const sync = async () => {
      try {
        const items = await notificationService.list({ limit: 12 });
        if (!active) return;

        if (syncedUser.current !== user.id) {
          syncedUser.current = user.id;
          seen.current = new Set(items.map((item) => item.id));
          return;
        }

        const fresh = items.filter((item) => !seen.current.has(item.id) && !item.is_read);
        items.forEach((item) => seen.current.add(item.id));
        if (fresh.length) show(fresh);
      } catch {
        /* polling is best effort */
      }
    };

    sync();
    const timer = setInterval(sync, POLL_MS);
    const onRefresh = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };

    window.addEventListener('campusloop:refresh-counts', onRefresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('campusloop:refresh-counts', onRefresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, user?.id, show]);

  useEffect(
    () => () => {
      Object.values(timers.current).forEach((timer) => clearTimeout(timer));
    },
    [],
  );

  const openNotification = (notification) => {
    dismiss(notification.id);
    if (!notification.is_read) {
      notificationService
        .markRead(notification.id)
        .then(() => window.dispatchEvent(new Event('campusloop:refresh-counts')))
        .catch(() => {});
    }
    if (notification.link) navigate(notification.link);
  };

  if (!popups.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-3 z-[70] flex flex-col items-stretch gap-2 sm:left-auto sm:right-6 sm:top-5 sm:w-[370px]"
      role="status"
      aria-live="polite"
    >
      {popups.map((notification) => {
        const meta = metaFor(notification.type);
        const Icon = meta.icon;
        return (
          <div
            key={notification.id}
            data-leaving={leaving.includes(notification.id)}
            className={cx(
              'toast-item pointer-events-auto overflow-hidden rounded-control border bg-surface/95 shadow-lift backdrop-blur-xl',
              TONES[meta.tone],
            )}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => openNotification(notification)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openNotification(notification);
                }
              }}
              className="flex cursor-pointer items-start gap-3 p-3.5"
            >
              <span className={cx('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', ICON_TONES[meta.tone])}>
                <Icon size={17} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted">{meta.label}</p>
                <p className="mt-0.5 text-[13px] font-semibold leading-snug text-ink">{notification.title}</p>
                {notification.body ? (
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted">{notification.body}</p>
                ) : null}
                <p className="mt-1.5 text-[10px] font-semibold text-brand-600 dark:text-brand-300">Open notification</p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  dismiss(notification.id);
                }}
                className="rounded-md p-1 text-muted transition hover:bg-elevated hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
