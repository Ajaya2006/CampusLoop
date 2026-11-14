import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, IndianRupee, ReceiptText, Store } from 'lucide-react';
import Avatar from '../../components/common/Avatar';
import ChartTooltip from '../../components/common/ChartTooltip';
import { adminService } from '../../services';
import { apiError } from '../../services/api';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { useCountUp, useReplayKey } from '../../hooks/useChartMotion';
import Tabs from '../../components/common/Tabs';
import { StatusBadge } from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { EmptyState, ErrorState, ListSkeleton } from '../../components/common/Feedback';
import { TRANSACTION_STATUS } from '../../constants';
import { formatDateTime, inr } from '../../utils/format';

const STATUS_COLORS = {
  pending: '#FBBF24',
  meeting_scheduled: '#7947FF',
  completion_requested: '#FF7800',
  completed: '#34D399',
  cancelled: '#F87171',
};

function MetricPill({ children }) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[7px] border border-line bg-elevated px-2 text-[9.5px] font-medium text-ink">
      {children}
    </span>
  );
}

function DealCard({ title, subtitle, action, children }) {
  return (
    <section className="surface-card flex h-full min-h-[300px] min-w-0 flex-col p-4 sm:p-5 xl:h-[300px]">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 truncate text-[10.5px] text-muted">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function DealTrend({ series }) {
  const [hover, setHover] = useState(null);
  const data = series || [];
  const replay = useReplayKey(data.map((point) => point.count).join(','));
  const max = Math.max(1, ...data.map((point) => Number(point.count || 0)));
  const points = data.map((point, index) => ({
    x: data.length > 1 ? (index / (data.length - 1)) * 100 : 50,
    y: 96 - (Number(point.count || 0) / max) * 92,
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = points.length ? `${line} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z` : '';
  const labels = [0, Math.round((data.length - 1) / 2), data.length - 1].filter(
    (index, position, list) => index >= 0 && data[index] && list.indexOf(index) === position,
  );

  if (!data.length) {
    return <div className="flex flex-1 items-center justify-center text-[11px] text-muted">No deals in this window.</div>;
  }

  return (
    <div className="flex h-full min-h-[120px] w-full flex-col">
      <div className="relative min-h-0 flex-1">
        <svg
          key={replay}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Deals started trend"
        >
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="rgb(var(--line))"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {area ? <path className="chart-area" d={area} fill="rgb(255 120 0 / 0.12)" /> : null}
          {line ? (
            <path
              className="chart-line"
              d={line}
              pathLength="1"
              fill="none"
              stroke="#FF7800"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex" onMouseLeave={() => setHover(null)}>
          {data.map((point, index) => (
            <span
              key={`hit-${point.date}`}
              className="h-full flex-1"
              onMouseEnter={() => setHover(index)}
              aria-hidden
            />
          ))}
        </div>
        <ChartTooltip
          open={hover !== null}
          x={data.length > 1 ? (hover / (data.length - 1)) * 100 : 50}
          y={hover !== null ? points[hover].y : 50}
        >
          {hover !== null ? (
            <>
              <span className="chart-tip-title">{data[hover]?.date?.slice(5)}</span>
              <span className="chart-tip-row">
                <span className="chart-tip-swatch" style={{ backgroundColor: '#FF7800' }} />
                <span className="chart-tip-label">Deals started</span>
                <span className="chart-tip-value">{data[hover]?.count ?? 0}</span>
              </span>
            </>
          ) : null}
        </ChartTooltip>
      </div>
      <div className="mt-2 flex shrink-0 justify-between text-[9.5px] text-muted">
        {labels.map((index) => (
          <span key={index}>{data[index]?.date?.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

function StatusSplit({ items }) {
  const [hover, setHover] = useState(null);
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const replay = useReplayKey(items.map((item) => `${item.status}:${item.count}`).join('|'));
  const animatedTotal = useCountUp(total);
  const hovered = hover === null ? null : items[hover];
  const before = hover === null ? 0 : items.slice(0, hover).reduce((sum, item) => sum + item.count, 0);
  const midAngle = hovered ? (((before + hovered.count / 2) / total) * 360 - 90) * (Math.PI / 180) : 0;
  let offset = 0;
  return (
    <div className="flex h-full items-center gap-4">
      <div className="relative h-[132px] w-[132px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="44" fill="none" stroke="rgb(var(--line))" strokeWidth="14" />
          {items.map((item, index) => {
            const percent = total ? (item.count / total) * 100 : 0;
            const dash = Math.max(percent - 0.6, 0);
            const currentOffset = offset;
            offset += percent;
            return (
              <circle
                key={`${item.status}-${replay}`}
                className={`chart-donut ${hover === index ? 'is-hover' : ''}`}
                cx="60"
                cy="60"
                r="44"
                fill="none"
                stroke={STATUS_COLORS[item.status] || '#7947FF'}
                strokeWidth="14"
                pathLength="100"
                style={{ '--dash': `${dash} ${100 - dash}`, '--dash-offset': -currentOffset }}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-lg font-bold leading-none text-ink">{Math.round(animatedTotal).toLocaleString('en-IN')}</p>
          <p className="mt-1 text-[9px] text-muted">deals</p>
        </div>
        <ChartTooltip
          open={!!hovered}
          x={50 + Math.cos(midAngle) * 37}
          y={50 + Math.sin(midAngle) * 37}
        >
          {hovered ? (
            <span className="chart-tip-row">
              <span
                className="chart-tip-swatch"
                style={{ backgroundColor: STATUS_COLORS[hovered.status] || '#7947FF' }}
              />
              <span className="chart-tip-label">{TRANSACTION_STATUS[hovered.status]?.label || hovered.status}</span>
              <span className="chart-tip-value">
                {hovered.count} · {total ? Math.round((hovered.count / total) * 100) : 0}%
              </span>
            </span>
          ) : null}
        </ChartTooltip>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {items.map((item, index) => {
          const percent = total ? Math.round((item.count / total) * 100) : 0;
          return (
            <div
              key={item.status}
              className="flex items-center gap-1.5 text-[10.5px]"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: STATUS_COLORS[item.status] || '#7947FF' }}
              />
              <span className="min-w-0 flex-1 truncate text-muted">{TRANSACTION_STATUS[item.status]?.label || item.status}</span>
              <span className="font-semibold text-ink">{item.count}</span>
              <span className="w-7 shrink-0 text-right text-[9px] text-muted">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'meeting_scheduled', label: 'Meeting set' },
  { value: 'completion_requested', label: 'Confirming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminTransactions() {
  useDocumentTitle('Transactions');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [summary, setSummary] = useState({ items: [], total: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [resultData, summaryData, analyticsData] = await Promise.all([
        adminService.transactions({ status, page, page_size: 20 }),
        adminService.transactions({ status: 'all', page: 1, page_size: 100 }).catch(() => ({ items: [], total: 0 })),
        adminService.analytics(30).catch(() => null),
      ]);
      setResult(resultData);
      setSummary(summaryData);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(apiError(err, 'Could not load transactions.').message);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const completedValue = (result?.items || [])
    .filter((item) => item.status === 'completed')
    .reduce((sum, item) => sum + Number(item.agreed_price || 0), 0);

  const topSellers = useMemo(() => {
    const sellers = new Map();
    (summary.items || []).forEach((transaction) => {
      const key = transaction.seller_id || transaction.seller_name;
      if (!key) return;
      const current = sellers.get(key) || {
        id: key,
        name: transaction.seller_name || 'Seller',
        deals: 0,
        value: 0,
      };
      current.deals += 1;
      if (transaction.status === 'completed') current.value += Number(transaction.agreed_price || 0);
      sellers.set(key, current);
    });
    return [...sellers.values()].sort((a, b) => b.value - a.value || b.deals - a.deals).slice(0, 3);
  }, [summary.items]);

  const statusSplit = useMemo(() => {
    const counts = new Map();
    (summary.items || []).forEach((transaction) => {
      counts.set(transaction.status, (counts.get(transaction.status) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([statusValue, count]) => ({ status: statusValue, count }))
      .sort((a, b) => b.count - a.count);
  }, [summary.items]);

  const dealSeries = analytics?.transactions_series || [];
  const dealTotal = dealSeries.reduce((sum, point) => sum + Number(point.count || 0), 0);
  const dealPeak = dealSeries.reduce((best, point) => Math.max(best, Number(point.count || 0)), 0);
  const topSellerMax = Math.max(1, ...topSellers.map((seller) => seller.value));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-brand-600">Admin / Transactions</p>
          <h1 className="mt-0.5 font-display text-[25px] font-bold tracking-tight text-ink sm:text-[29px]">Deal flow</h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Offline deals recorded on CampusLoop. Values are agreed prices, not processed payments.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-control border border-line bg-surface px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted">Visible records</p>
            <p className="text-sm font-bold text-ink">{result?.total ?? '—'}</p>
          </div>
          <div className="rounded-control border border-line bg-surface px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted">Completed (page)</p>
            <p className="flex items-center gap-0.5 text-sm font-bold text-ink">
              <IndianRupee size={13} /> {completedValue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid items-stretch gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <DealCard
          title="Top sellers"
          subtitle="By completed deal value"
          action={
            <MetricPill>
              <Store size={11} /> Sellers
            </MetricPill>
          }
        >
          {topSellers.length ? (
            <ul className="flex flex-1 flex-col justify-between gap-3">
              {topSellers.map((seller, index) => {
                const width = Math.max(3, Math.round((seller.value / topSellerMax) * 100));
                const color = index === 0 ? '#FF7800' : index === 1 ? '#7947FF' : '#6B7280';
                return (
                  <li key={seller.id}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 shrink-0 text-[10px] font-semibold text-muted">#{index + 1}</span>
                      <Avatar name={seller.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] font-semibold text-ink">{seller.name}</span>
                        <span className="text-[10px] text-muted">
                          {seller.deals} deal{seller.deals === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-ink">{inr(seller.value)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 pl-6">
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-elevated">
                        <div
                          className="chart-bar-x h-full rounded-full"
                          style={{ width: `${width}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-7 shrink-0 text-right text-[9px] text-muted">{width}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[11px] text-muted">No sellers in recent deals.</p>
            </div>
          )}
        </DealCard>

        <DealCard
          title="Deal overview"
          subtitle="New deals started over 30 days"
          action={
            <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[7px] bg-success/10 px-2 text-[9.5px] font-semibold text-success">
              <ArrowUpRight size={11} /> Live
            </span>
          }
        >
          <DealTrend series={dealSeries} />
          <div className="mt-2 flex shrink-0 items-center justify-between gap-3 border-t border-line pt-2 text-[9.5px] text-muted">
            <span>{dealTotal.toLocaleString('en-IN')} deals started</span>
            <span>Peak {dealPeak} in a day</span>
          </div>
        </DealCard>

        <DealCard
          title="Status split"
          subtitle="Recent deal outcomes"
          action={<MetricPill>{summary.items?.length ?? 0} records</MetricPill>}
        >
          {statusSplit.length ? (
            <StatusSplit items={statusSplit} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[11px] text-muted">No deals recorded.</p>
            </div>
          )}
        </DealCard>
      </div>

      <Tabs
        items={TABS.map((tab) => ({ ...tab, count: tab.value === status ? result?.total : undefined }))}
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        className="mb-4 w-full overflow-x-auto sm:w-fit"
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <ListSkeleton rows={5} />
      ) : !result?.items?.length ? (
        <EmptyState icon={ReceiptText} title="No transactions in this view" description="Deals started from accepted offers appear here." />
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-line bg-canvas text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Product</th>
                  <th className="px-4 py-2.5 font-semibold">Buyer</th>
                  <th className="px-4 py-2.5 font-semibold">Seller</th>
                  <th className="px-4 py-2.5 font-semibold">Agreed price</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((transaction) => (
                  <tr key={transaction.id} className="text-[13px]">
                    <td className="px-4 py-3">
                      <Link to={`/product/${transaction.product_id}`} className="block max-w-[200px] truncate font-medium text-ink hover:text-brand-600">
                        {transaction.product_title}
                      </Link>
                      <p className="text-[11px] text-muted">{transaction.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink">{transaction.buyer_name}</p>
                      <p className="text-[11px] text-muted">{transaction.buyer_confirmed_at ? 'Confirmed' : 'Not confirmed'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink">{transaction.seller_name}</p>
                      <p className="text-[11px] text-muted">{transaction.seller_email || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">{inr(transaction.agreed_price)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge map={TRANSACTION_STATUS} value={transaction.status} />
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted">
                      {formatDateTime(transaction.created_at)}
                      {transaction.completed_at ? <span className="block">Done {formatDateTime(transaction.completed_at)}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line p-3">
            <Pagination page={result.page} pages={result.pages} onChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
