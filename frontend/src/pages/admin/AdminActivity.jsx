import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flag,
  PackageSearch,
  ReceiptText,
  Search,
  ShieldCheck,
  Tag,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { adminService } from '../../services';
import { apiError } from '../../services/api';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Avatar from '../../components/common/Avatar';
import { EmptyState, ErrorState, LoadingPage } from '../../components/common/Feedback';
import StatCard from '../../components/dashboard/StatCard';
import { cx, formatDate, formatTime, parseDate, timeAgo } from '../../utils/format';
import { sumSeries, toPoints } from '../../utils/series';

const RANGES = [7, 14, 30, 90];

const FILTERS = [
  { id: 'all', label: 'All activity' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'listings', label: 'Listings' },
  { id: 'deals', label: 'Deals' },
  { id: 'members', label: 'Members' },
];

const AUDIT_META = {
  'listing.approve': { title: 'Listing approved', icon: CheckCircle2, tone: 'brand', to: '/admin/listings' },
  'listing.reject': { title: 'Listing rejected', icon: XCircle, tone: 'danger', to: '/admin/listings' },
  'listing.remove': { title: 'Listing removed', icon: Ban, tone: 'danger', to: '/admin/listings' },
  'report.resolve': { title: 'Report resolved', icon: Flag, tone: 'brand', to: '/admin/reports' },
  'user.suspend': { title: 'Member suspended', icon: Ban, tone: 'danger', to: '/admin/users' },
  'user.activate': { title: 'Member reinstated', icon: CheckCircle2, tone: 'brand', to: '/admin/users' },
  'verification.document.view': { title: 'Verification document viewed', icon: ShieldCheck, tone: 'neutral', to: '/admin/verifications' },
  'verification.verified': { title: 'Student verified', icon: ShieldCheck, tone: 'brand', to: '/admin/verifications' },
  'verification.rejected': { title: 'Verification rejected', icon: ShieldCheck, tone: 'danger', to: '/admin/verifications' },
};

const ENTITY_ROUTES = {
  product: '/admin/listings',
  report: '/admin/reports',
  user: '/admin/users',
  student_verification: '/admin/verifications',
};

function dealTitle(status) {
  if (status === 'completed') return 'Deal completed';
  if (status === 'cancelled') return 'Deal cancelled';
  if (status === 'completion_requested') return 'Completion requested';
  if (status === 'meeting_scheduled') return 'Meeting scheduled';
  return 'Deal started';
}

function auditTitle(action = '') {
  const parts = action.split('.');
  const verb = parts[parts.length - 1].replace(/_/g, ' ');
  const subject = parts[0].replace(/_/g, ' ');
  return `${subject.charAt(0).toUpperCase()}${subject.slice(1)} ${verb}`;
}

export default function AdminActivity() {
  useDocumentTitle('Platform activity');
  const [days, setDays] = useState(14);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState({ items: [], total: 0 });
  const [users, setUsers] = useState({ items: [], total: 0 });
  const [transactions, setTransactions] = useState({ items: [], total: 0 });
  const [auditLogs, setAuditLogs] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      adminService.analytics(days),
      adminService.stats(),
      adminService.listings({ status: 'all', page: 1, page_size: 100 }).catch(() => ({ items: [], total: 0 })),
      adminService.users({ page: 1, page_size: 40 }).catch(() => ({ items: [], total: 0 })),
      adminService.transactions({ status: 'all', page: 1, page_size: 100 }).catch(() => ({ items: [], total: 0 })),
      adminService.auditLogs({ page: 1, page_size: 50 }).catch(() => ({ items: [], total: 0 })),
    ])
      .then(([analytics, statsResult, listingsResult, usersResult, transactionsResult, logsResult]) => {
        if (!active) return;
        setData(analytics);
        setStats(statsResult);
        setListings(listingsResult);
        setUsers(usersResult);
        setTransactions(transactionsResult);
        setAuditLogs(logsResult);
      })
      .catch((err) => {
        if (active) setError(apiError(err, 'Could not load platform activity.').message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const events = useMemo(() => {
    const rows = [];
    (auditLogs.items || []).forEach((log) => {
      const meta = AUDIT_META[log.action] || {
        title: auditTitle(log.action),
        icon: Activity,
        tone: 'navy',
        to: ENTITY_ROUTES[log.entity_type] || '/admin',
      };
      rows.push({
        id: `audit-${log.id}`,
        group: 'moderation',
        title: meta.title,
        detail: [log.admin_name, log.detail].filter(Boolean).join(' · ') || log.entity_type,
        at: log.created_at,
        to: meta.to,
        icon: meta.icon,
        tone: meta.tone,
      });
    });
    (listings.items || []).forEach((item) => {
      rows.push({
        id: `listing-${item.id}`,
        group: 'listings',
        title: item.status === 'pending_verification' ? 'Listing submitted' : 'Listing published',
        detail: `"${item.title}" by ${item.seller_name || 'member'}`,
        at: item.created_at,
        to: `/product/${item.id}`,
        icon: Tag,
        tone: item.status === 'pending_verification' ? 'brand' : 'navy',
      });
    });
    (transactions.items || []).forEach((item) => {
      rows.push({
        id: `deal-${item.id}`,
        group: 'deals',
        title: dealTitle(item.status),
        detail: item.product_title || 'Marketplace item',
        at: item.completed_at || item.created_at,
        to: '/admin/transactions',
        icon: ReceiptText,
        tone: item.status === 'completed' ? 'brand' : 'navy',
      });
    });
    (users.items || []).forEach((member) => {
      rows.push({
        id: `member-${member.id}`,
        group: 'members',
        title: 'New member joined',
        detail: `${member.full_name} · ${member.college || 'College not set'}`,
        at: member.created_at,
        to: '/admin/users',
        icon: UserPlus,
        tone: 'brand',
      });
    });
    const cutoff = Date.now() - days * 86400000;
    return rows
      .filter((row) => {
        const at = parseDate(row.at);
        return at && at.getTime() >= cutoff;
      })
      .sort((a, b) => parseDate(b.at) - parseDate(a.at));
  }, [auditLogs.items, days, listings.items, transactions.items, users.items]);

  const filterCounts = useMemo(() => {
    const counts = { all: events.length };
    events.forEach((event) => {
      counts[event.group] = (counts[event.group] || 0) + 1;
    });
    return counts;
  }, [events]);

  const visibleEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      if (filter !== 'all' && event.group !== filter) return false;
      if (!needle) return true;
      return [event.title, event.detail].some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [events, filter, query]);

  const newestMembers = useMemo(
    () =>
      [...(users.items || [])]
        .sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at))
        .slice(0, 5),
    [users.items],
  );

  if (loading && !data) return <LoadingPage label="Loading platform activity…" />;
  if (error) return <ErrorState message={error} onRetry={() => setDays(days)} />;
  if (!data) return null;

  const listingSeries = data.listings_series || [];
  const transactionSeries = data.transactions_series || [];
  const usersSeries = data.users_series || [];
  const moderationSeries = data.moderation_series || [];
  const rangeLabel = `Last ${days} days`;
  const moderationCount = events.filter((event) => event.group === 'moderation').length;

  const summary = [
    {
      label: 'Listings added', value: sumSeries(listingSeries), icon: Tag, to: '/admin/listings',
      points: toPoints(listingSeries, 'count'), accent: 'brand',
      hint: `New listings in ${rangeLabel.toLowerCase()}`,
    },
    {
      label: 'Deals started', value: sumSeries(transactionSeries), icon: ReceiptText, to: '/admin/transactions',
      points: toPoints(transactionSeries, 'count'), accent: 'navy',
      hint: `Deals opened in ${rangeLabel.toLowerCase()}`,
    },
    {
      label: 'New members', value: sumSeries(usersSeries), icon: UserPlus, to: '/admin/users',
      points: toPoints(usersSeries, 'count'), accent: 'success',
      hint: `Sign-ups in ${rangeLabel.toLowerCase()}`,
    },
    {
      label: 'Moderation actions', value: moderationCount, icon: ShieldCheck, to: '/admin/verifications',
      points: toPoints(moderationSeries, 'count'), accent: 'info',
      hint: `Admin actions in ${rangeLabel.toLowerCase()}`,
    },
  ];

  const attention = [
    { label: 'Listings pending review', value: stats?.pending_listings ?? 0, icon: Tag, to: '/admin/listings' },
    { label: 'Student verifications', value: stats?.pending_verifications ?? 0, icon: ShieldCheck, to: '/admin/verifications' },
    { label: 'Active reports', value: stats?.active_reports ?? 0, icon: Flag, to: '/admin/reports' },
    { label: 'Open deals', value: stats?.open_transactions ?? 0, icon: ReceiptText, to: '/admin/transactions' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-brand-600">Admin / Activity</p>
          <h1 className="mt-0.5 font-display text-[25px] font-bold tracking-tight text-ink sm:text-[29px]">Platform activity</h1>
          <p className="mt-0.5 text-[12px] text-muted">Every moderation action, listing and deal as it happens.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search activity"
              className="input-base h-9 pl-8 text-[12px]"
              aria-label="Search activity"
            />
          </div>
          <div className="flex gap-1 rounded-control border border-line bg-surface p-1">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDays(range)}
                className={cx(
                  'rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition',
                  range === days ? 'bg-brand-500 text-white' : 'text-muted hover:text-ink',
                )}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stat-grid">
        {summary.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            to={item.to}
            points={item.points}
            accent={item.accent}
            hint={item.hint}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_318px] xl:items-start">
        <section className="surface-card flex min-w-0 flex-col overflow-hidden xl:h-[640px]">
          <div className="flex shrink-0 flex-col gap-3 border-b border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[14px] font-semibold text-ink">Activity log</h2>
                <p className="mt-0.5 text-[10.5px] text-muted">{rangeLabel} · {visibleEvents.length} event{visibleEvents.length === 1 ? '' : 's'}</p>
              </div>
              <span className="inline-flex h-7 items-center rounded-[7px] border border-line bg-elevated px-2 text-[9.5px] font-medium text-ink">
                Live
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cx(
                    'rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition',
                    filter === item.id
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-line bg-surface text-muted hover:text-ink',
                  )}
                >
                  {item.label}
                  <span className={cx('ml-1.5 text-[9px]', filter === item.id ? 'text-white/80' : 'text-muted/70')}>
                    {filterCounts[item.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {visibleEvents.length ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="divide-y divide-line">
              {visibleEvents.slice(0, 40).map((event, index, list) => {
                const Icon = event.icon;
                return (
                  <li key={event.id} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[104px_30px_minmax(0,1fr)] sm:px-5">
                    <span className="hidden pt-1 text-right text-[9.5px] leading-tight text-muted sm:block">
                      <span className="block">{formatDate(event.at)}</span>
                      <span className="block text-muted/80">{formatTime(event.at)}</span>
                    </span>
                    <span className="relative flex flex-col items-center">
                      <span className="dashboard-card-icon h-7 w-7 rounded-full">
                        <Icon size={13} strokeWidth={1.9} />
                      </span>
                      {index < list.length - 1 ? <span className="mt-1 w-px flex-1 bg-line" /> : null}
                    </span>
                    <Link to={event.to} className="min-w-0 pb-1 transition hover:opacity-75">
                      <span className="block text-[11.5px] font-semibold text-ink">{event.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[10.5px] leading-snug text-muted">{event.detail}</span>
                      <span className="mt-1 block text-[9px] text-muted/80 sm:hidden">{timeAgo(event.at)}</span>
                    </Link>
                  </li>
                );
              })}
              </ul>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                icon={Search}
                title={query ? 'No matching activity' : 'No activity in this window'}
                description={query ? 'Try a different action, member or listing.' : 'New activity will appear here as it happens.'}
              />
            </div>
          )}

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-4 py-3 sm:px-5">
            <p className="text-[10px] text-muted">
              Showing {Math.min(visibleEvents.length, 40)} of {visibleEvents.length} events
            </p>
            <Link to="/admin/transactions" className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">
              Open deal flow <ChevronRight size={11} />
            </Link>
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-ink">Needs attention</h2>
              <Clock3 size={13} className="text-muted" />
            </div>
            <ul className="mt-3 divide-y divide-line">
              {attention.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="flex items-center gap-2.5 py-2.5 transition hover:opacity-75">
                    <span className="dashboard-card-icon h-7 w-7 rounded-full">
                      <item.icon size={13} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-muted">{item.label}</span>
                    <span className="shrink-0 text-[12px] font-bold text-ink">{Number(item.value || 0).toLocaleString('en-IN')}</span>
                    <ChevronRight size={12} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-ink">Newest members</h2>
              <Users size={13} className="text-muted" />
            </div>
            {newestMembers.length ? (
              <ul className="mt-3 divide-y divide-line">
                {newestMembers.map((member) => (
                  <li key={member.id} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <Avatar name={member.full_name} src={member.avatar_url} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-ink">{member.full_name}</span>
                      <span className="block truncate text-[9px] text-muted">{member.college || 'College not set'}</span>
                    </span>
                    <span className="shrink-0 text-[9px] text-muted">{timeAgo(member.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[11px] text-muted">No members yet.</p>
            )}
            <Link to="/admin/users" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">
              Manage users <ChevronRight size={11} />
            </Link>
          </section>

          <section className="surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-ink">Listing health</h2>
              <PackageSearch size={13} className="text-muted" />
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
              Review stale, low-detail and unapproved listings that may need moderation.
            </p>
            <Link to="/admin/listing-health" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">
              Open listing health <ChevronRight size={11} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
