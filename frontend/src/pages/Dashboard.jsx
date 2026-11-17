import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Eye,
  HandCoins,
  Plus,
  Tag,
  Wallet,
} from 'lucide-react';
import { authService } from '../services';
import { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useCountUp, useReplayKey } from '../hooks/useChartMotion';
import StatCard from '../components/dashboard/StatCard';
import ChartTooltip from '../components/common/ChartTooltip';
import { ErrorState, InlineAlert, LoadingPage } from '../components/common/Feedback';
import { buttonStyles } from '../components/common/Button';
import { StatusBadge, VerifiedBadge } from '../components/common/Badge';
import ProductImage from '../components/common/ProductImage';
import { PRODUCT_STATUS, OFFER_STATUS } from '../constants';
import { categoryImage } from '../utils/categoryImages';
import { inr, timeAgo } from '../utils/format';
import { toPoints } from '../utils/series';

const CHART_COLORS = ['bg-navy', 'bg-brand-500', 'bg-brand-300', 'bg-[#B9B7B2]', 'bg-[#DDD9D2]'];

function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`surface-card flex h-full min-w-0 flex-col p-4 sm:p-5 ${className}`}>
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 truncate text-[10.5px] text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function RangePill({ children }) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-line bg-elevated px-2.5 text-[11px] font-medium text-ink">
      {children}
    </span>
  );
}

function ListingActivity({ series }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...series.flatMap((item) => [item.listed, item.sold]));
  const hovered = hover === null ? null : series[hover];
  return (
    <Panel
      title="Listing activity"
      subtitle="Listed versus sold over the last 8 months"
      action={<RangePill>Last 8 months</RangePill>}
      className="min-w-0"
    >
      <div className="mt-4 flex items-center gap-4 text-[10.5px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> Listed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Sold</span>
      </div>

      <div className="mt-4 grid min-h-[178px] flex-1 grid-cols-8 items-end gap-2 border-b border-line pb-2">
        {series.map((item, index) => {
          const tallest = Math.max(item.listed, item.sold, 1) / max;
          return (
            <div
              key={item.month}
              className="relative flex h-full min-h-[168px] flex-col justify-end"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            >
              <ChartTooltip open={hover === index} x={50} y={Math.max(12, (1 - tallest) * 100)}>
                <span className="chart-tip-title">{item.label}</span>
                <span className="chart-tip-row">
                  <span className="chart-tip-swatch bg-brand-500" />
                  <span className="chart-tip-label">Listed</span>
                  <span className="chart-tip-value">{item.listed}</span>
                </span>
                <span className="chart-tip-row">
                  <span className="chart-tip-swatch bg-accent" />
                  <span className="chart-tip-label">Sold</span>
                  <span className="chart-tip-value">{item.sold}</span>
                </span>
              </ChartTooltip>
              <div className="flex flex-1 items-end justify-center gap-1.5">
                <span
                  className={`chart-bar w-3 rounded-t bg-brand-500 transition-opacity ${hover !== null && hover !== index ? 'opacity-45' : 'opacity-100'}`}
                  style={{ height: `${Math.max(4, (item.listed / max) * 100)}%`, animationDelay: `${index * 55}ms` }}
                />
                <span
                  className={`chart-bar w-3 rounded-t bg-accent transition-opacity ${hover !== null && hover !== index ? 'opacity-45' : 'opacity-100'}`}
                  style={{ height: `${Math.max(4, (item.sold / max) * 100)}%`, animationDelay: `${index * 55 + 45}ms` }}
                />
              </div>
              <span className="mt-2 text-center text-[9.5px] text-muted">{item.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-between text-[10.5px] text-muted">
        <span>{hovered ? `${hovered.label}: ${hovered.listed} listed` : `${series.reduce((sum, item) => sum + item.listed, 0)} listings created`}</span>
        <span>{hovered ? `${hovered.sold} sold` : `${series.reduce((sum, item) => sum + item.sold, 0)} marked sold`}</span>
      </div>
    </Panel>
  );
}

function Donut({ items, total, value, caption }) {
  const [hover, setHover] = useState(null);
  const replay = useReplayKey(items.map((item) => `${item.label}:${item.value}`).join('|'));
  const animatedValue = useCountUp(Number(value ?? total) || 0, { duration: 780 });
  const hovered = hover === null ? null : items[hover];
  const before = hover === null ? 0 : items.slice(0, hover).reduce((sum, item) => sum + item.value, 0);
  const midAngle = hovered ? (((before + hovered.value / 2) / total) * 360 - 90) * (Math.PI / 180) : 0;
  let offset = 0;
  return (
    <div className="mt-4 flex flex-1 flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-[132px] w-[132px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="44" fill="none" stroke="rgb(var(--line))" strokeWidth="14" />
          {total > 0
            ? items.map((item, index) => {
                const percent = (item.value / total) * 100;
                const dash = Math.max(percent - 0.6, 0);
                const currentOffset = offset;
                offset += percent;
                return (
                  <circle
                    key={`${item.label}-${replay}`}
                    className={`chart-donut ${hover === index ? 'is-hover' : ''}`}
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="14"
                    pathLength="100"
                    style={{ '--dash': `${dash} ${100 - dash}`, '--dash-offset': -currentOffset }}
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="font-display text-2xl font-bold leading-none text-ink">{Math.round(animatedValue).toLocaleString('en-IN')}</p>
          <p className="mt-1 text-[9.5px] text-muted">{caption}</p>
        </div>
        <ChartTooltip
          open={!!hovered}
          x={50 + Math.cos(midAngle) * 38}
          y={50 + Math.sin(midAngle) * 38}
        >
          {hovered ? (
            <span className="chart-tip-row">
              <span className="chart-tip-swatch" style={{ backgroundColor: hovered.color }} />
              <span className="chart-tip-label">{hovered.label}</span>
              <span className="chart-tip-value">
                {hovered.value} · {Math.round((hovered.value / total) * 100)}%
              </span>
            </span>
          ) : null}
        </ChartTooltip>
      </div>

      <div className="w-full min-w-0 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-[11px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="min-w-0 flex-1 truncate text-muted">{item.label}</span>
              <span className="font-semibold text-ink">{item.value}</span>
              <span className="w-8 text-right text-muted">{total ? Math.round((item.value / total) * 100) : 0}%</span>
            </div>
          ))
        ) : (
          <p className="text-center text-xs text-muted">No offers yet.</p>
        )}
      </div>
    </div>
  );
}

function OfferPipeline({ pipeline }) {
  const items = Object.entries(pipeline || {})
    .filter(([, value]) => value > 0)
    .map(([status, value]) => ({
      label: OFFER_STATUS[status]?.label || status,
      value,
      color:
        status === 'pending'
          ? '#6D4AFF'
          : status === 'accepted'
            ? '#1F9D79'
            : status === 'rejected'
              ? '#C94F3F'
              : '#97AECB',
    }));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <Panel title="Offer pipeline" subtitle="Offers received on your listings" action={<RangePill>All time</RangePill>}>
      <Donut items={items} total={total} value={total} caption="offers" />
    </Panel>
  );
}

function CategoryBreakdown({ categories }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...categories.map((item) => item.count));
  const total = categories.reduce((sum, item) => sum + item.count, 0);
  return (
    <Panel title="Listing mix" subtitle="Your listings by category" action={<RangePill>All time</RangePill>}>
      {categories.length ? (
        <div className="mt-5 flex-1 space-y-4">
          {categories.slice(0, 5).map((item, index) => (
            <div
              key={item.name}
              className="relative"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            >
              <ChartTooltip open={hover === index} x={50} y={0}>
                <span className="chart-tip-row">
                  <span className="chart-tip-label">{item.name}</span>
                  <span className="chart-tip-value">
                    {item.count} · {Math.round((item.count / total) * 100)}%
                  </span>
                </span>
              </ChartTooltip>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate text-ink">{item.name}</span>
                <span className="shrink-0 text-muted">{item.count} · {Math.round((item.count / total) * 100)}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-elevated">
                <div
                  className={`chart-bar-x h-full rounded-full ${CHART_COLORS[index % CHART_COLORS.length]}`}
                  style={{ width: `${Math.max(5, (item.count / max) * 100)}%`, animationDelay: `${index * 60}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">Create a listing to see your category mix.</p>
      )}
    </Panel>
  );
}

function DealSummary({ data }) {
  const { transactions, deal_value: dealValue, sales_by_category: salesByCategory } = data;
  return (
    <Panel title="Deal value" subtitle="Completed sales and open handovers" action={<RangePill>All time</RangePill>}>
      <div className="mt-4 rounded-[12px] bg-elevated p-4">
        <p className="text-[10.5px] text-muted">Total agreed value</p>
        <p className="mt-1 font-display text-[26px] font-bold leading-none text-ink">{inr(dealValue)}</p>
        <div className="mt-3 flex items-center gap-4 text-[10.5px]">
          <span className="inline-flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full bg-success" /> {transactions.completed} completed</span>
          <span className="inline-flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full bg-brand-500" /> {transactions.open} open</span>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-2.5">
        {salesByCategory.length ? (
          salesByCategory.slice(0, 3).map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3 text-[11.5px]">
              <span className="min-w-0 truncate text-muted">{item.name}</span>
              <span className="shrink-0 font-semibold text-ink">{inr(item.value)}</span>
            </div>
          ))
        ) : (
          <p className="text-xs leading-relaxed text-muted">Completed deals will be grouped by category here.</p>
        )}
      </div>

      <Link to="/transactions" className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600">
        View transactions <ArrowRight size={12} />
      </Link>
    </Panel>
  );
}

function RecentActivity({ items }) {
  return (
    <Panel
      title="Recent activity"
      subtitle="Notifications from your marketplace"
      action={
        <Link to="/notifications" className="rounded-lg p-1 text-muted hover:text-ink" aria-label="All notifications">
          <Bell size={16} />
        </Link>
      }
    >
      {items.length ? (
        <ul className="mt-3 divide-y divide-line">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              <Link to={item.link || '/notifications'} className="flex gap-2.5 py-3 transition hover:opacity-80">
                <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.is_read ? 'bg-elevated text-muted' : 'bg-brand-50 text-brand-600'}`}>
                  <CheckCircle2 size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-semibold text-ink">{item.title}</span>
                  {item.body ? <span className="mt-0.5 line-clamp-2 block text-[10.5px] leading-relaxed text-muted">{item.body}</span> : null}
                  <span className="mt-1 block text-[9.5px] text-muted">{timeAgo(item.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-center text-sm text-muted">No activity yet. Your notifications will appear here.</p>
      )}
    </Panel>
  );
}

function TopListings({ listings }) {
  return (
    <Panel
      title="Your listings"
      subtitle="Most-viewed items on your storefront"
      action={<Link to="/my-listings" className="text-[11px] font-semibold text-brand-600">View all</Link>}
      className="overflow-hidden"
    >
      {listings.length ? (
        <div className="-mx-4 mt-3 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[660px] text-left">
            <thead>
              <tr className="border-y border-line bg-elevated/70 text-[10px] uppercase tracking-[0.08em] text-muted">
                <th className="px-4 py-2.5 font-medium sm:px-5">Listing</th>
                <th className="px-3 py-2.5 font-medium">Views</th>
                <th className="px-3 py-2.5 font-medium">Saves</th>
                <th className="px-3 py-2.5 font-medium">Price</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 sm:px-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {listings.map((listing) => (
                <tr key={listing.id} className="text-[11.5px] transition hover:bg-elevated/50">
                  <td className="px-4 py-2.5 sm:px-5">
                    <Link to={`/product/${listing.id}`} className="flex items-center gap-2.5">
                      <ProductImage
                        src={listing.cover_image}
                        alt={listing.title}
                        fallback={categoryImage(null, listing.category)}
                        className="h-9 w-9 shrink-0 rounded-[8px]"
                      />
                      <span className="min-w-0">
                        <span className="block max-w-[220px] truncate font-semibold text-ink">{listing.title}</span>
                        <span className="block text-[10px] text-muted">{listing.category}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{listing.views}</td>
                  <td className="px-3 py-2.5 text-muted">{listing.saves}</td>
                  <td className="px-3 py-2.5 font-semibold text-ink">{inr(listing.price)}</td>
                  <td className="px-3 py-2.5"><StatusBadge map={PRODUCT_STATUS} value={listing.status} size="xs" /></td>
                  <td className="px-4 py-2.5 text-right sm:px-5">
                    <Link to={`/product/${listing.id}`} className="inline-flex rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink" aria-label={`Open ${listing.title}`}>
                      <ChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center rounded-[12px] border border-dashed border-line p-8 text-center">
          <Tag size={22} className="text-brand-400" />
          <p className="mt-2 text-sm font-medium text-ink">No listings yet</p>
          <p className="mt-1 text-xs text-muted">That old textbook could pay for this month’s coffee.</p>
          <Link to="/sell" className={buttonStyles({ size: 'sm', className: 'mt-3' })}>
            <Plus size={14} /> Create your first listing
          </Link>
        </div>
      )}
    </Panel>
  );
}

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    authService
      .dashboard()
      .then(setData)
      .catch((err) => setError(apiError(err, 'Could not load your dashboard.').message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <LoadingPage label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { listings, offers, transactions } = data;
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-brand-600">Dashboard</p>
          <h1 className="mt-0.5 font-display text-[25px] font-extrabold tracking-tight text-ink sm:text-[28px]">
            {greeting}, {firstName}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <VerifiedBadge status={data.verification_status} compact />
            <span className="text-[11px] text-muted">{user?.college}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/sell" className={buttonStyles({ size: 'sm' })}>
            <Plus size={15} /> New listing
          </Link>
          <Link to={`/seller/${user?.id}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            View storefront
          </Link>
        </div>
      </div>

      {data.verification_status !== 'verified' ? (
        <InlineAlert
          tone={data.verification_status === 'pending' ? 'warning' : 'info'}
          title={
            data.verification_status === 'pending'
              ? 'Your verification is under review'
              : data.verification_status === 'rejected'
                ? 'Your verification was rejected'
                : 'Verify your student account'
          }
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {data.verification_status === 'pending'
                ? 'A moderator is checking your student details. Listing and messaging unlock once approved.'
                : data.verification_status === 'rejected'
                  ? 'Review the moderator note and submit again with correct details.'
                  : 'Submit your student ID so you can list items, message sellers and send offers.'}
            </p>
            <Link to="/verify" className="shrink-0 font-semibold underline underline-offset-2">
              {data.verification_status === 'rejected' ? 'Try again' : 'Open verification'}
            </Link>
          </div>
        </InlineAlert>
      ) : null}

      <div className="stat-grid">
        <StatCard
          label="Active listings"
          value={listings.active}
          icon={Tag}
          hint={`${listings.total} total · ${listings.pending} pending`}
          to="/my-listings"
          points={toPoints(data.listing_series || [], 'listed')}
          accent="brand"
        />
        <StatCard
          label="Listing views"
          value={data.total_views ?? 0}
          icon={Eye}
          hint={`${data.wishlist_saves ?? 0} wishlist saves`}
          to="/my-listings"
          points={toPoints(data.views_series || [], 'value')}
          accent="navy"
        />
        <StatCard
          label="Offers received"
          value={offers.received}
          icon={HandCoins}
          hint={`${offers.pending_received} awaiting your reply`}
          to="/offers"
          points={toPoints(data.offers_series || [], 'value')}
          accent="info"
        />
        <StatCard
          label="Deal value"
          value={inr(data.deal_value ?? 0)}
          icon={Wallet}
          hint={`${transactions.completed} completed deals`}
          to="/transactions"
          points={toPoints(data.deal_value_series || [], 'value')}
          accent="success"
        />
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[1.55fr_1fr]">
        <ListingActivity series={data.listing_series || []} />
        <OfferPipeline pipeline={data.offer_pipeline} />
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CategoryBreakdown categories={data.category_breakdown || []} />
        <DealSummary data={data} />
        <RecentActivity items={data.recent_activity} />
      </div>

      <TopListings listings={data.top_listings || []} />

      <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface p-3.5 text-[11px] text-muted">
        <CheckCircle2 size={14} className="shrink-0 text-success" />
        CampusLoop never asks for your password, OTP or bank details. All payments happen in person.
      </div>
    </div>
  );
}
