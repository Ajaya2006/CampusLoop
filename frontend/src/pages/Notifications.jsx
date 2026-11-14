import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react';
import { notificationService } from '../services';
import { apiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import Tabs from '../components/common/Tabs';
import Button from '../components/common/Button';
import { EmptyState, ErrorState, ListSkeleton } from '../components/common/Feedback';
import { cx, timeAgo } from '../utils/format';

const TONES = {
  listing_pending: 'bg-warning/10 text-warning',
  new_listing: 'bg-warning/10 text-warning',
  listing_approved: 'bg-success/10 text-success',
  listing_rejected: 'bg-danger/10 text-danger',
  listing_removed: 'bg-danger/10 text-danger',
  new_message: 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300',
  new_offer: 'bg-warning/10 text-warning',
  offer_accepted: 'bg-success/10 text-success',
  offer_rejected: 'bg-danger/10 text-danger',
  counteroffer: 'bg-warning/10 text-warning',
  meeting_proposed: 'bg-accent/10 text-accent',
  meeting_rescheduled: 'bg-warning/10 text-warning',
  meeting_confirmed: 'bg-success/10 text-success',
  meeting_cancelled: 'bg-danger/10 text-danger',
  transaction_started: 'bg-accent/10 text-accent',
  transaction_confirmation: 'bg-warning/10 text-warning',
  transaction_completed: 'bg-success/10 text-success',
  transaction_cancelled: 'bg-danger/10 text-danger',
  new_review: 'bg-warning/10 text-warning',
  new_report: 'bg-danger/10 text-danger',
  report_updated: 'bg-accent/10 text-accent',
  verification_submitted: 'bg-accent/10 text-accent',
  verification_approved: 'bg-success/10 text-success',
  verification_rejected: 'bg-danger/10 text-danger',
};

export default function Notifications() {
  useDocumentTitle('Notifications');
  const toast = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await notificationService.list({ limit: 50 }));
    } catch (err) {
      setError(apiError(err, 'Could not load notifications.').message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    setBusy(true);
    try {
      await notificationService.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      window.dispatchEvent(new Event('campusloop:refresh-counts'));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Could not update notifications', apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      try {
        await notificationService.markRead(notification.id);
        setItems((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
        );
        window.dispatchEvent(new Event('campusloop:refresh-counts'));
      } catch {
        /* navigation should still work */
      }
    }
    if (notification.link) navigate(notification.link);
  };

  const remove = async (event, notification) => {
    event.stopPropagation();
    try {
      await notificationService.remove(notification.id);
      setItems((current) => current.filter((item) => item.id !== notification.id));
      window.dispatchEvent(new Event('campusloop:refresh-counts'));
    } catch (err) {
      toast.error('Could not remove notification', apiError(err).message);
    }
  };

  const unreadCount = items.filter((item) => !item.is_read).length;
  const visible = filter === 'unread' ? items.filter((item) => !item.is_read) : items;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Listing approvals, offers, meetings and transaction updates — all in one place."
        actions={
          <Button variant="secondary" size="sm" icon={CheckCheck} loading={busy} disabled={!unreadCount} onClick={markAll}>
            Mark all read
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Tabs
          items={[
            { value: 'all', label: 'All', count: items.length },
            { value: 'unread', label: 'Unread', count: unreadCount },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <ListSkeleton rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={filter === 'unread' ? BellOff : Bell}
          title={filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}
          description="Activity on your listings, offers and transactions will show up here."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((notification) => (
            <li key={notification.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => openNotification(notification)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openNotification(notification);
                }}
                className={cx(
                  'group flex cursor-pointer items-start gap-3 rounded-card border p-4 transition',
                  notification.is_read
                    ? 'border-line bg-surface hover:bg-elevated/50'
                    : 'border-brand-200 bg-brand-50/40 hover:bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20',
                )}
              >
                <span className={cx('mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONES[notification.type] || 'bg-elevated text-muted')}>
                  <Bell size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cx('text-sm', notification.is_read ? 'font-medium text-ink' : 'font-semibold text-ink')}>
                      {notification.title}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted">{timeAgo(notification.created_at)}</span>
                  </div>
                  {notification.body ? <p className="mt-0.5 text-[13px] text-muted">{notification.body}</p> : null}
                  {!notification.is_read ? (
                    <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-brand-500" aria-label="Unread" />
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={(event) => remove(event, notification)}
                  className="rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                  aria-label="Delete notification"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
