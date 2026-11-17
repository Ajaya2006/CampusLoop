import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, PackageSearch, Search, ShieldAlert, Tag } from 'lucide-react';
import { adminService } from '../../services';
import { apiError } from '../../services/api';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { useCountUp, useReplayKey } from '../../hooks/useChartMotion';
import Button from '../../components/common/Button';
import ProductImage from '../../components/common/ProductImage';
import { StatusBadge } from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import ChartTooltip from '../../components/common/ChartTooltip';
import { EmptyState, ErrorState, LoadingPage } from '../../components/common/Feedback';
import { PRODUCT_STATUS } from '../../constants';
import { formatDate, inr } from '../../utils/format';

const STATUS_COLORS = {
  available: '#ff7800',
  approved: '#34D399',
  pending_verification: '#FBBF24',
  reserved: '#7947FF',
  sold: '#6B7280',
  rejected: '#F87171',
  removed: '#8F97A2',
  draft: '#4B5563',
};

const RANGES = [30, 90];

function ListingTrend({ series }) {
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
    return <div className="flex flex-1 items-center justify-center text-[11px] text-muted">No listings in this window.</div>;
  }

  return (
    <div className="mt-4 flex h-full min-h-[150px] w-full flex-col">
      <div className="relative min-h-0 flex-1">
        <svg
          key={replay}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="New listings trend"
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
          {area ? <path className="chart-area" d={area} fill="rgba(255, 120, 0, 0.1)" /> : null}
          {line ? (
            <path
              className="chart-line"
              d={line}
              pathLength="1"
              fill="none"
              stroke="#ff7800"
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
                <span className="chart-tip-swatch" style={{ backgroundColor: '#ff7800' }} />
                <span className="chart-tip-label">Listings added</span>
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

function StatusDonut({ items, total }) {
  const [hover, setHover] = useState(null);
  const replay = useReplayKey(items.map((item) => `${item.status}:${item.count}`).join('|'));
  const animatedTotal = useCountUp(total);
  const hovered = hover === null ? null : items[hover];
  const before = hover === null ? 0 : items.slice(0, hover).reduce((sum, item) => sum + item.count, 0);
  const midAngle = hovered && total ? (((before + hovered.count / 2) / total) * 360 - 90) * (Math.PI / 180) : 0;
  let offset = 0;
  return (
    <div className="mt-4 flex flex-1 flex-col items-center gap-4">
      <div className="relative h-[132px] w-[132px]">
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
          <p className="font-display text-xl font-bold text-ink">{Math.round(animatedTotal).toLocaleString('en-IN')}</p>
          <p className="text-[9.5px] text-muted">listings</p>
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
              <span className="chart-tip-label">{PRODUCT_STATUS[hovered.status]?.label || hovered.status}</span>
              <span className="chart-tip-value">
                {hovered.count} · {total ? Math.round((hovered.count / total) * 100) : 0}%
              </span>
            </span>
          ) : null}
        </ChartTooltip>
      </div>
      <div className="grid w-full grid-cols-2 content-start gap-2">
        {items.map((item, index) => (
          <div
            key={item.status}
            className="flex items-center gap-1.5 text-[10px]"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] || '#7947FF' }} />
            <span className="min-w-0 flex-1 truncate text-muted">{PRODUCT_STATUS[item.status]?.label || item.status}</span>
            <span className="font-semibold text-ink">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminListingHealth() {
  useDocumentTitle('Listing health');
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [available, setAvailable] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      adminService.analytics(days),
      adminService.listings({ status: 'available', page_size: 100 }),
      adminService.listings({ status: 'rejected', page_size: 100 }),
      adminService.listings({ status: 'removed', page_size: 100 }),
    ])
      .then(([analyticsResult, availableResult, rejectedResult, removedResult]) => {
        if (!active) return;
        setAnalytics(analyticsResult);
        setAvailable(availableResult.items || []);
        setFlagged(
          [...(rejectedResult.items || []), ...(removedResult.items || [])].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          ),
        );
      })
      .catch((err) => {
        if (active) setError(apiError(err, 'Could not load listing health.').message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const lowVisibility = useMemo(
    () => [...available].sort((a, b) => (a.views_count || 0) - (b.views_count || 0)).slice(0, 3),
    [available],
  );

  const statusItems = useMemo(
    () => (analytics?.listings_by_status || []).filter((item) => item.count > 0),
    [analytics],
  );
  const statusTotal = statusItems.reduce((sum, item) => sum + item.count, 0);

  const filteredFlagged = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return flagged;
    return flagged.filter((item) =>
      [item.title, item.seller_name, item.rejection_reason, item.category_name].some((value) =>
        String(value || '').toLowerCase().includes(needle),
      ),
    );
  }, [flagged, query]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredFlagged.length / pageSize));
  const pageItems = filteredFlagged.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  if (loading && !analytics) return <LoadingPage label="Loading listing health…" />;
  if (error) return <ErrorState message={error} onRetry={() => setDays(days)} />;
  if (!analytics) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-brand-600">Admin / Management / Listing health</p>
          <h1 className="mt-0.5 font-display text-[25px] font-bold tracking-tight text-ink sm:text-[29px]">Listing health</h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Monitor listing volume, visibility and moderation outcomes.
          </p>
        </div>
        <div className="flex gap-1 rounded-control border border-line bg-surface p-1">
          {RANGES.map((range) => (
            <Button key={range} size="xs" variant={range === days ? 'primary' : 'ghost'} onClick={() => setDays(range)}>
              {range}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <section className="surface-card flex h-full min-h-[280px] min-w-0 flex-col p-4 sm:p-5">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Listing volume</h2>
              <p className="mt-0.5 text-[10.5px] text-muted">New listings over {days} days</p>
            </div>
            <span className="inline-flex h-7 shrink-0 items-center rounded-[7px] border border-line bg-elevated px-2 text-[9.5px] font-medium text-ink">
              Last {days} days
            </span>
          </div>
          <ListingTrend series={analytics.listings_series} />
        </section>

        <section className="surface-card flex h-full min-h-[280px] min-w-0 flex-col p-4 sm:p-5">
          <div className="shrink-0">
            <h2 className="text-[14px] font-semibold text-ink">Listing health</h2>
            <p className="mt-0.5 text-[10.5px] text-muted">All listings by status</p>
          </div>
          {statusItems.length ? (
            <StatusDonut items={statusItems} total={statusTotal} />
          ) : (
            <p className="mt-6 text-[11px] text-muted">No listings yet.</p>
          )}
        </section>

        <section className="surface-card flex h-full min-h-[280px] min-w-0 flex-col p-4 sm:p-5">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Low visibility</h2>
              <p className="mt-0.5 text-[10.5px] text-muted">Live listings with the fewest views</p>
            </div>
            <Link to="/admin/listings" className="text-[10.5px] font-semibold text-brand-600">View all</Link>
          </div>
          {lowVisibility.length ? (
            <ul className="mt-3 space-y-2">
              {lowVisibility.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/product/${item.id}`}
                    className="flex items-center gap-2.5 rounded-[9px] border border-line bg-canvas p-2 transition hover:border-brand-200"
                  >
                    <ProductImage src={item.cover_image} alt={item.title} className="h-[46px] w-[38px] shrink-0 rounded-[5px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-semibold text-ink">{item.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                        <span className="inline-flex items-center gap-0.5"><Eye size={9} /> {item.views_count || 0} views</span>
                        <span>{inr(item.price)}</span>
                      </span>
                    </span>
                    <span className="inline-flex h-7 items-center rounded-[6px] bg-brand-500 px-2 text-[10px] font-semibold text-white">
                      Review
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted">No live listings.</p>
          )}
        </section>
      </div>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-danger/10 text-danger">
              <ShieldAlert size={15} />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Flagged &amp; removed listings</h2>
              <p className="mt-0.5 text-[10.5px] text-muted">Rejected and removed posts that need a record</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search a listing"
              className="input-base h-9 pl-8 text-[12px]"
              aria-label="Search flagged listings"
            />
          </div>
        </div>

        {pageItems.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-line bg-[#F6F4F1] text-[10px] uppercase tracking-[0.06em] text-muted dark:bg-elevated">
                    <th className="px-4 py-2.5 font-semibold">Listing</th>
                    <th className="px-4 py-2.5 font-semibold">Views</th>
                    <th className="px-4 py-2.5 font-semibold">Seller</th>
                    <th className="px-4 py-2.5 font-semibold">Reason / notes</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pageItems.map((item) => (
                    <tr key={item.id} className="text-[12px]">
                      <td className="px-4 py-3">
                        <Link to={`/product/${item.id}`} className="flex items-center gap-2.5">
                          <ProductImage src={item.cover_image} alt={item.title} className="h-[46px] w-[38px] shrink-0 rounded-[5px]" />
                          <span className="min-w-0">
                            <span className="block max-w-[220px] truncate font-semibold text-ink">{item.title}</span>
                            <span className="mt-0.5 block text-[10px] text-muted">
                              #{item.id.slice(0, 6).toUpperCase()} · {item.category_name}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{item.views_count || 0}</td>
                      <td className="px-4 py-3">
                        <p className="max-w-[150px] truncate font-medium text-ink">{item.seller_name}</p>
                        <p className="max-w-[150px] truncate text-[10px] text-muted">{item.seller_college}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[230px] truncate text-muted">{item.rejection_reason || 'Removed by a moderator'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3"><StatusBadge map={PRODUCT_STATUS} value={item.status} size="xs" /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-ink">{inr(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted">
                Showing {pageItems.length} of {filteredFlagged.length} flagged listings
              </p>
              <Pagination page={page} pages={pageCount} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="p-4">
            <EmptyState
              icon={Tag}
              title="No flagged listings"
              description={query ? 'No records match that search.' : 'Rejected and removed listings will appear here.'}
            />
          </div>
        )}
      </section>

      <p className="flex items-center gap-1.5 text-[10.5px] text-muted">
        <PackageSearch size={12} /> Counts reflect current listing records. Moderation reasons are written by admins.
      </p>
    </div>
  );
}
