import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  HandCoins,
  ReceiptText,
  Search,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react';
import { adminService } from '../../services';
import { apiError } from '../../services/api';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { useCountUp, useReplayKey } from '../../hooks/useChartMotion';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/common/Avatar';
import ProductImage from '../../components/common/ProductImage';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState, ErrorState, LoadingPage } from '../../components/common/Feedback';
import AdminTrendCharts from '../../components/admin/AdminTrendCharts';
import ChartTooltip from '../../components/common/ChartTooltip';
import StatCard from '../../components/dashboard/StatCard';
import { OFFER_STATUS, PRODUCT_STATUS } from '../../constants';
import { formatDateTime, inr, timeAgo } from '../../utils/format';
import { sumSeries, toPoints } from '../../utils/series';

const RANGES = [7, 14, 30, 90];

/* The headline cards keep their own window so the chart dropdowns stay local. */
const KPI_DAYS = 30;

const CATEGORY_COLORS = ['#FF7800', '#7947FF', '#6B7280', '#A78BFA', '#FFA94D', '#4B5563'];

const STATUS_COLORS = {
  available: '#FF7800',
  approved: '#34D399',
  pending_verification: '#FBBF24',
  reserved: '#7947FF',
  sold: '#6B7280',
  rejected: '#F87171',
  removed: '#8F97A2',
  draft: '#4B5563',
};

const OFFER_COLORS = {
  pending: '#FF7800',
  accepted: '#34D399',
  rejected: '#F87171',
  countered: '#7947FF',
  cancelled: '#8F97A2',
  expired: '#6B7280',
};

function compactInr(value) {
  const amount = Number(value || 0);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(amount >= 100000000 ? 0 : 1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(amount >= 1000000 ? 0 : 1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `₹${amount}`;
}

function bucketSeries(series = [], count = 8) {
  if (!series.length) return [];
  const size = Math.ceil(series.length / count);
  const buckets = [];
  for (let index = 0; index < series.length; index += size) {
    const chunk = series.slice(index, index + size);
    buckets.push({
      date: chunk[chunk.length - 1].date,
      value: chunk.reduce((sum, point) => sum + Number(point.value || 0), 0),
    });
  }
  return buckets;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseChartDate(value) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatChartDate(value) {
  const date = parseChartDate(value);
  if (!date) return value || '';
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function formatChartDateShort(value) {
  const date = parseChartDate(value);
  if (!date) return String(value || '').slice(5);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

function niceCeil(value) {
  if (!value) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    const candidate = factor * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

function niceCountMax(value) {
  return Math.max(4, Math.ceil(value / 4) * 4);
}

function RangeSelect({ days, onChange }) {
  return (
    <label className="relative inline-flex h-8 shrink-0 items-center rounded-[8px] border border-line bg-elevated pl-3 pr-7 text-[10.5px] font-medium text-ink">
      <select
        value={days}
        onChange={(event) => onChange(Number(event.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
        aria-label="Chart date range"
      >
        {RANGES.map((range) => (
          <option key={range} value={range}>
            Last {range} days
          </option>
        ))}
      </select>
      <span>Last {days} days</span>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 text-muted" />
    </label>
  );
}

function UsageChart({ transactionSeries, listingSeries }) {
  const points = transactionSeries || [];
  const listings = listingSeries || [];
  const count = Math.max(points.length, listings.length);
  const [activeIndex, setActiveIndex] = useState(null);
  const replay = useReplayKey(
    `${points.map((point) => point.count).join(',')}|${listings.map((point) => point.count).join(',')}`,
  );

  if (!count) {
    return <div className="flex h-[230px] items-center justify-center text-sm text-muted">No activity in this window.</div>;
  }

  const W = 380;
  const H = 230;
  const padLeft = 28;
  const padRight = 8;
  const padTop = 14;
  const padBottom = 32;
  const values = Array.from({ length: count }, (_, index) => ({
    date: points[index]?.date || listings[index]?.date || '',
    deals: Number(points[index]?.count || 0),
    listings: Number(listings[index]?.count || 0),
  }));
  const max = niceCountMax(Math.max(1, ...values.map((point) => Math.max(point.deals, point.listings))));
  const slot = (W - padLeft - padRight) / count;
  const x = (index) => padLeft + index * slot + slot / 2;
  const y = (value) => H - padBottom - (value / max) * (H - padTop - padBottom);
  const groupWidth = Math.min(slot * 0.72, 28);
  const groupRadius = Math.min(8, groupWidth / 2);
  const orangeWidth = groupWidth * 0.7;
  const maxIndex = values.reduce((best, point, index) => {
    const total = point.deals + point.listings;
    const bestTotal = values[best].deals + values[best].listings;
    return total > bestTotal ? index : best;
  }, 0);
  const selected = activeIndex === null ? maxIndex : activeIndex;
  const selectedPoint = values[selected] || values[0];
  const labelStep = Math.max(1, Math.ceil(count / 7));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const tooltipWidth = 142;
  const tooltipHeight = 60;
  const tooltipX = Math.min(Math.max(x(selected) - tooltipWidth / 2, 2), W - tooltipWidth - 2);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-4 text-[10.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: 'rgb(var(--chart-muted))' }} /> Listings added
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-brand-500" /> Deals started
        </span>
      </div>
      <svg
        key={replay}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Marketplace usage trends chart"
        onMouseLeave={() => setActiveIndex(null)}
      >
        {ticks.map((ratio) => (
          <g key={ratio}>
            <line x1={padLeft} x2={W - padRight} y1={y(max * ratio)} y2={y(max * ratio)} stroke="rgb(var(--line))" />
            <text x={padLeft - 6} y={y(max * ratio) + 3} textAnchor="end" fill="currentColor" className="text-[9px] text-muted">
              {Math.round(max * ratio)}
            </text>
          </g>
        ))}

        {values.map((point, index) => {
          const listingsTop = y(point.listings);
          const dealsTop = y(point.deals);
          const groupX = x(index) - groupWidth / 2;
          return (
            <g key={`${point.date}-${index}`}>
              {point.listings > 0 ? (
                <rect
                  className="chart-bar"
                  style={{ animationDelay: `${index * 35}ms` }}
                  x={groupX}
                  y={listingsTop}
                  width={groupWidth}
                  height={Math.max(3, H - padBottom - listingsTop)}
                  rx={groupRadius}
                  fill="rgb(var(--chart-muted))"
                />
              ) : null}
              {point.deals > 0 ? (
                <rect
                  className="chart-bar"
                  style={{ animationDelay: `${index * 35 + 35}ms` }}
                  x={x(index) - orangeWidth / 2}
                  y={dealsTop}
                  width={orangeWidth}
                  height={Math.max(3, H - padBottom - dealsTop)}
                  rx={Math.min(10, orangeWidth / 2)}
                  fill="#FF7800"
                />
              ) : null}
            </g>
          );
        })}

        {values.map((point, index) => (
          <rect
            key={`hit-${point.date}-${index}`}
            x={padLeft + index * slot}
            y={padTop}
            width={slot}
            height={H - padTop - padBottom}
            fill="transparent"
            onMouseEnter={() => setActiveIndex(index)}
          />
        ))}

        <g transform={`translate(${tooltipX} 4)`} pointerEvents="none">
          <rect width={tooltipWidth} height={tooltipHeight} rx="9" fill="rgb(var(--surface))" stroke="rgb(var(--line))" />
          <text x="11" y="16" fill="currentColor" className="text-[9.5px] font-semibold text-ink">{formatChartDate(selectedPoint.date)}</text>
          <line x1="11" x2={tooltipWidth - 11} y1="22" y2="22" stroke="rgb(var(--line))" />
          <rect x="11" y="28" width="7" height="7" rx="2" fill="rgb(var(--chart-muted))" />
          <text x="23" y="34.5" fill="currentColor" className="text-[9px] text-muted">Listings added</text>
          <text x={tooltipWidth - 11} y="34.5" textAnchor="end" fill="currentColor" className="text-[10px] font-bold text-ink">{selectedPoint.listings}</text>
          <rect x="11" y="42" width="7" height="7" rx="2" fill="#FF7800" />
          <text x="23" y="48.5" fill="currentColor" className="text-[9px] text-muted">Deals started</text>
          <text x={tooltipWidth - 11} y="48.5" textAnchor="end" fill="currentColor" className="text-[10px] font-bold text-ink">{selectedPoint.deals}</text>
        </g>

        {values.map((point, index) =>
          index % labelStep === 0 ? (
            <text key={`label-${point.date}-${index}`} x={x(index)} y={H - 8} textAnchor="middle" fill="currentColor" className="text-[9px] text-muted">
              {formatChartDateShort(point.date)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function ValueChart({ series }) {
  const buckets = bucketSeries(series || []);
  const replay = useReplayKey((series || []).map((point) => point.value).join(','));
  const rawMax = Math.max(0, ...buckets.map((point) => point.value));
  if (!buckets.length || !rawMax) {
    return (
      <div className="flex h-[230px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-ink">No completed deal value yet</p>
        <p className="text-[10.5px] text-muted">Confirmed deals will build this chart.</p>
      </div>
    );
  }

  const W = 380;
  const H = 230;
  const padLeft = 44;
  const padRight = 8;
  const padTop = 26;
  const padBottom = 32;
  const max = niceCeil(rawMax);
  const slot = (W - padLeft - padRight) / buckets.length;
  const x = (index) => padLeft + index * slot + slot / 2;
  const y = (value) => H - padBottom - (value / max) * (H - padTop - padBottom);
  const maxIndex = buckets.reduce((best, point, index) => (point.value > buckets[best].value ? index : best), 0);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelY = Math.max(y(buckets[maxIndex].value) - 9, padTop - 8);

  return (
    <div className="mt-4">
      <svg
        key={replay}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Completed deal revenue chart"
      >
        {ticks.map((ratio) => (
          <g key={ratio}>
            <line x1={padLeft} x2={W - padRight} y1={y(max * ratio)} y2={y(max * ratio)} stroke="rgb(var(--line))" />
            <text x={padLeft - 6} y={y(max * ratio) + 3} textAnchor="end" fill="currentColor" className="text-[9px] text-muted">
              {compactInr(max * ratio)}
            </text>
          </g>
        ))}

        {buckets.map((point, index) => {
          const top = y(point.value);
          const highlighted = index === maxIndex;
          return (
            <rect
              key={`area-${point.date}-${index}`}
              className="chart-bar"
              style={{ animationDelay: `${index * 45}ms` }}
              x={x(index) - slot / 2}
              y={top}
              width={slot}
              height={H - padBottom - top}
              fill={highlighted ? 'rgba(255, 120, 0, 0.18)' : 'rgb(var(--chart-muted))'}
            >
              <title>{`${formatChartDate(point.date)}: ${inr(point.value)} completed deal value`}</title>
            </rect>
          );
        })}

        {buckets.map((point, index) => {
          const flat = (
            <line
              key={`step-${point.date}-${index}`}
              x1={x(index) - slot / 2}
              x2={x(index) + slot / 2}
              y1={y(point.value)}
              y2={y(point.value)}
              stroke={index === maxIndex ? '#FF7800' : '#8F97A2'}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
          const connector =
            index < buckets.length - 1 ? (
              <line
                key={`link-${point.date}-${index}`}
                x1={x(index) + slot / 2}
                x2={x(index) + slot / 2}
                y1={y(point.value)}
                y2={y(buckets[index + 1].value)}
                stroke="rgb(var(--ink))"
                strokeWidth="2"
              />
            ) : null;
          return (
            <g key={`step-group-${point.date}-${index}`}>
              {connector}
              {flat}
            </g>
          );
        })}

        <text x={x(maxIndex)} y={labelY} textAnchor="middle" fill="currentColor" className="text-[10.5px] font-bold text-ink">
          {compactInr(buckets[maxIndex].value)}
        </text>

        {buckets.map((point, index) => (
          <text key={`label-${point.date}-${index}`} x={x(index)} y={H - 8} textAnchor="middle" fill="currentColor" className="text-[9px] text-muted">
            {formatChartDateShort(point.date)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function CategoryBars({ items }) {
  const [hover, setHover] = useState(null);
  const all = items || [];
  const total = all.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const replay = useReplayKey(all.map((item) => `${item.name}:${item.count}`).join('|'));
  if (!all.length || !total) {
    return <p className="mt-6 text-sm text-muted">No category activity yet.</p>;
  }

  const top = all.slice(0, 5);
  const otherCount = all.slice(5).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const otherName = top.some((item) => item.name === 'Other') ? 'More categories' : 'Other';
  const categories = otherCount ? [...top, { name: otherName, count: otherCount }] : top;

  const BAR_COUNT = 46;
  const bars = [];
  let remaining = BAR_COUNT;
  categories.forEach((item, index) => {
    const last = index === categories.length - 1;
    const allocation = last
      ? remaining
      : Math.min(remaining, Math.max(1, Math.round((Number(item.count) / total) * BAR_COUNT)));
    for (let bar = 0; bar < allocation; bar += 1) {
      bars.push({ category: item.name, color: CATEGORY_COLORS[index % CATEGORY_COLORS.length], index });
    }
    remaining -= allocation;
  });

  const hoveredBar = hover === null ? null : bars[hover];
  const hoveredItem = hoveredBar ? categories.find((item) => item.name === hoveredBar.category) : null;

  return (
    <>
      <div className="relative mt-5 flex min-h-[84px] flex-1 items-stretch gap-[3px]" role="img" aria-label="Listings by category">
        {bars.map((bar, index) => (
          <span
            key={`${bar.category}-${index}-${replay}`}
            className="chart-bar min-w-0 flex-1 rounded-[1.5px]"
            style={{ backgroundColor: bar.color, animationDelay: `${index * 8}ms` }}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <ChartTooltip
          open={!!hoveredItem}
          x={hover === null ? 50 : ((hover + 0.5) / bars.length) * 100}
          y={0}
        >
          {hoveredItem ? (
            <span className="chart-tip-row">
              <span className="chart-tip-swatch" style={{ backgroundColor: hoveredBar.color }} />
              <span className="chart-tip-label">{hoveredItem.name}</span>
              <span className="chart-tip-value">
                {Number(hoveredItem.count).toLocaleString('en-IN')} ·{' '}
                {Math.round((Number(hoveredItem.count) / total) * 100)}%
              </span>
            </span>
          ) : null}
        </ChartTooltip>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {categories.map((item, index) => {
          const percent = Math.round((Number(item.count) / total) * 100);
          return (
            <div key={item.name} className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 h-5 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-semibold text-ink">{item.name}</span>
                <span className="block text-[9px] leading-tight text-muted">
                  {percent}% · {Number(item.count).toLocaleString('en-IN')} listings
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function OfferPipeline({ items }) {
  const rows = (items || []).filter((item) => Number(item.count) > 0).sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const [hover, setHover] = useState(null);
  const replay = useReplayKey(rows.map((item) => `${item.status}:${item.count}`).join('|'));
  const animatedTotal = useCountUp(total);
  const hovered = hover === null ? null : rows[hover];
  const before = hover === null ? 0 : rows.slice(0, hover).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const midAngle = hovered ? (((before + Number(hovered.count) / 2) / total) * 360 - 90) * (Math.PI / 180) : 0;
  let offset = 0;

  return (
    <section className="surface-card flex min-h-[230px] min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="dashboard-card-icon mt-0.5 h-8 w-8 shrink-0 rounded-[9px]">
            <HandCoins size={15} />
          </span>
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Offer pipeline</h2>
            <p className="mt-0.5 text-[10.5px] text-muted">Every offer sent across CampusLoop, all users</p>
          </div>
        </div>
        <span className="inline-flex h-7 shrink-0 items-center rounded-[7px] border border-line bg-elevated px-2 text-[9px] font-medium text-ink">
          All time
        </span>
      </div>

      {rows.length && total ? (
        <div className="mt-3 flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-[118px] w-[118px] shrink-0 self-center sm:self-auto">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="60" cy="60" r="43" fill="none" stroke="rgb(var(--line))" strokeWidth="15" />
              {rows.map((item, index) => {
                const percent = (Number(item.count) / total) * 100;
                const dash = Math.max(percent - 0.8, 0);
                const currentOffset = offset;
                offset += percent;
                return (
                  <circle
                    key={`${item.status}-${replay}`}
                    className={`chart-donut ${hover === index ? 'is-hover' : ''}`}
                    cx="60"
                    cy="60"
                    r="43"
                    fill="none"
                    stroke={OFFER_COLORS[item.status] || '#7947FF'}
                    strokeWidth="15"
                    pathLength="100"
                    style={{ '--dash': `${dash} ${100 - dash}`, '--dash-offset': -currentOffset }}
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-[19px] font-bold leading-none text-ink">{Math.round(animatedTotal).toLocaleString('en-IN')}</p>
              <p className="mt-1 text-[8.5px] text-muted">offers</p>
            </div>
            <ChartTooltip
              open={!!hovered}
              x={50 + Math.cos(midAngle) * 36}
              y={50 + Math.sin(midAngle) * 36}
            >
              {hovered ? (
                <span className="chart-tip-row">
                  <span
                    className="chart-tip-swatch"
                    style={{ backgroundColor: OFFER_COLORS[hovered.status] || '#7947FF' }}
                  />
                  <span className="chart-tip-label">{OFFER_STATUS[hovered.status]?.label || hovered.status}</span>
                  <span className="chart-tip-value">
                    {Number(hovered.count).toLocaleString('en-IN')} · {Math.round((Number(hovered.count) / total) * 100)}%
                  </span>
                </span>
              ) : null}
            </ChartTooltip>
          </div>

          <div className="grid min-w-0 flex-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
            {rows.map((item, index) => {
              const percent = Math.round((Number(item.count) / total) * 100);
              return (
                <div
                  key={item.status}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: OFFER_COLORS[item.status] || '#7947FF' }} />
                    <span className="min-w-0 flex-1 truncate text-muted">{OFFER_STATUS[item.status]?.label || item.status}</span>
                    <span className="font-semibold text-ink">{Number(item.count).toLocaleString('en-IN')}</span>
                    <span className="w-7 text-right text-[8.5px] text-muted">{percent}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="chart-bar-x h-full rounded-full"
                      style={{
                        width: `${Math.max(percent, 2)}%`,
                        backgroundColor: OFFER_COLORS[item.status] || '#7947FF',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted">No offers have been sent yet.</p>
        </div>
      )}
    </section>
  );
}

function StatusDonut({ items }) {
  const [hover, setHover] = useState(null);
  const rows = (items || []).filter((item) => Number(item.count) > 0).sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const replay = useReplayKey(rows.map((item) => `${item.status}:${item.count}`).join('|'));
  const animatedTotal = useCountUp(total);

  if (!rows.length || !total) {
    return <p className="mt-6 text-sm text-muted">No listings to break down yet.</p>;
  }

  const visible = rows.slice(0, 5);
  const hovered = hover === null ? null : visible[hover];
  const before = hover === null ? 0 : visible.slice(0, hover).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const midAngle = hovered ? (((before + Number(hovered.count) / 2) / total) * 360 - 90) * (Math.PI / 180) : 0;
  let offset = 0;

  return (
    <div className="mt-4 flex flex-1 items-center gap-4">
      <div className="relative h-[132px] w-[132px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="43" fill="none" stroke="rgb(var(--line))" strokeWidth="15" />
          {visible.map((item, index) => {
            const percent = (Number(item.count) / total) * 100;
            const dash = Math.max(percent - 0.8, 0);
            const currentOffset = offset;
            offset += percent;
            return (
              <circle
                key={`${item.status}-${replay}`}
                className={`chart-donut ${hover === index ? 'is-hover' : ''}`}
                cx="60"
                cy="60"
                r="43"
                fill="none"
                stroke={STATUS_COLORS[item.status] || '#7947FF'}
                strokeWidth="15"
                pathLength="100"
                style={{ '--dash': `${dash} ${100 - dash}`, '--dash-offset': -currentOffset }}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-[19px] font-bold leading-none text-ink">{Math.round(animatedTotal).toLocaleString('en-IN')}</p>
          <p className="mt-1 text-[8.5px] text-muted">listings</p>
        </div>
        <ChartTooltip
          open={!!hovered}
          x={50 + Math.cos(midAngle) * 36}
          y={50 + Math.sin(midAngle) * 36}
        >
          {hovered ? (
            <span className="chart-tip-row">
              <span
                className="chart-tip-swatch"
                style={{ backgroundColor: STATUS_COLORS[hovered.status] || '#7947FF' }}
              />
              <span className="chart-tip-label">{PRODUCT_STATUS[hovered.status]?.label || hovered.status}</span>
              <span className="chart-tip-value">
                {Number(hovered.count).toLocaleString('en-IN')} · {Math.round((Number(hovered.count) / total) * 100)}%
              </span>
            </span>
          ) : null}
        </ChartTooltip>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {visible.map((item, index) => {
          const percent = Math.round((Number(item.count) / total) * 100);
          return (
            <div
              key={item.status}
              className="flex items-center gap-1.5"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: STATUS_COLORS[item.status] || '#7947FF' }} />
              <span className="min-w-0 flex-1 truncate text-[9.5px] text-muted">
                {PRODUCT_STATUS[item.status]?.label || item.status}
              </span>
              <span className="text-[9px] font-semibold text-ink">{Number(item.count).toLocaleString('en-IN')}</span>
              <span className="w-7 text-right text-[8.5px] text-muted">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* One analytics request per window, cached by its day count, so every chart can
   load its own period without refetching or showing another period's bars. */
function useAnalyticsCache(windows, refreshKey = 0) {
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState('');
  const requested = useRef(new Set());

  useEffect(() => {
    let active = true;
    setError('');
    windows.forEach((days) => {
      const key = `${refreshKey}:${days}`;
      if (requested.current.has(key)) return;
      requested.current.add(key);
      setLoading((prev) => ({ ...prev, [days]: true }));
      adminService
        .analytics(days)
        .then((result) => {
          if (active) setCache((prev) => ({ ...prev, [days]: result }));
        })
        .catch((err) => {
          if (active) setError(apiError(err, 'Could not load analytics for this period.').message);
        })
        .finally(() => {
          if (active) setLoading((prev) => ({ ...prev, [days]: false }));
        });
    });
    return () => {
      active = false;
    };
  }, [windows, refreshKey]);

  return { cache, loading, error };
}

export default function AdminAnalytics() {
  useDocumentTitle('Admin dashboard');
  const { user } = useAuth();
  const [usageDays, setUsageDays] = useState(30);
  const [revenueDays, setRevenueDays] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState({ items: [], total: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [transactions, setTransactions] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const windows = useMemo(
    () => [...new Set([KPI_DAYS, usageDays, revenueDays])],
    [usageDays, revenueDays],
  );
  const { cache, loading: analyticsLoading, error: analyticsError } = useAnalyticsCache(windows, refreshKey);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      adminService.stats(),
      adminService.listings({ status: 'all', page: 1, page_size: 100 }).catch(() => ({ items: [], total: 0 })),
      adminService.users({ page: 1, page_size: 8 }).catch(() => ({ items: [], total: 0 })),
      adminService.transactions({ status: 'all', page: 1, page_size: 100 }).catch(() => ({ items: [], total: 0 })),
    ])
      .then(([statsResult, listingsResult, usersResult, transactionsResult]) => {
        if (!active) return;
        setStats(statsResult);
        setListings(listingsResult);
        setRecentUsers(usersResult.items || []);
        setTransactions(transactionsResult);
      })
      .catch((err) => {
        if (active) setError(apiError(err, 'Could not load admin dashboard.').message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const filteredListings = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return listings.items || [];
    return (listings.items || []).filter((item) =>
      [item.title, item.seller_name, item.category_name, item.status].some((value) =>
        String(value || '').toLowerCase().includes(needle),
      ),
    );
  }, [listings.items, query]);

  const popularListings = useMemo(
    () =>
      [...(listings.items || [])]
        .sort((a, b) => Number(b.views_count || 0) - Number(a.views_count || 0) || new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3),
    [listings.items],
  );

  const topSellers = useMemo(() => {
    const sellers = new Map();
    (transactions.items || []).forEach((transaction) => {
      const key = transaction.seller_id || transaction.seller_name;
      if (!key) return;
      const current = sellers.get(key) || {
        id: key,
        name: transaction.seller_name || 'Seller',
        deals: 0,
        completed: 0,
        value: 0,
      };
      current.deals += 1;
      if (transaction.status === 'completed') {
        current.completed += 1;
        current.value += Number(transaction.agreed_price || 0);
      }
      sellers.set(key, current);
    });
    return [...sellers.values()].sort((a, b) => b.value - a.value || b.deals - a.deals).slice(0, 4);
  }, [transactions.items]);

  const activityFeed = useMemo(() => {
    const events = [];
    (listings.items || []).slice(0, 8).forEach((item) => {
      events.push({
        id: `listing-${item.id}`,
        type: 'listing',
        title: 'Listing published',
        detail: `"${item.title}" by ${item.seller_name}`,
        at: item.created_at,
        to: `/product/${item.id}`,
        icon: Tag,
        tone: 'brand',
      });
    });
    (transactions.items || []).slice(0, 8).forEach((item) => {
      events.push({
        id: `deal-${item.id}`,
        type: 'deal',
        title: item.status === 'completed' ? 'Deal completed' : 'Deal started',
        detail: item.product_title || 'Marketplace item',
        at: item.completed_at || item.created_at,
        to: '/admin/transactions',
        icon: ReceiptText,
        tone: 'navy',
      });
    });
    (recentUsers || []).slice(0, 6).forEach((member) => {
      events.push({
        id: `member-${member.id}`,
        type: 'member',
        title: 'New member registered',
        detail: `${member.full_name} joined from ${member.college}`,
        at: member.created_at,
        to: '/admin/users',
        icon: UserPlus,
        tone: 'brand',
      });
    });
    return events
      .filter((event) => event.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 5);
  }, [listings.items, recentUsers, transactions.items]);

  const baseline = cache[KPI_DAYS] || null;
  const usageData = cache[usageDays] || null;
  const revenueData = cache[revenueDays] || null;
  const retry = () => {
    setError('');
    setRefreshKey((key) => key + 1);
  };

  if (error || analyticsError) return <ErrorState message={error || analyticsError} onRetry={retry} />;
  if (!baseline) return <LoadingPage label="Loading admin dashboard…" />;

  const listingsSeries = baseline.listings_series || [];
  const usersSeries = baseline.users_series || [];
  const pendingSeries = baseline.pending_listings_series || [];
  const viewsSeries = baseline.views_series || [];
  const usageListingSeries = usageData?.listings_series || [];
  const usageTransactionSeries = usageData?.transactions_series || [];
  const valueSeries = revenueData?.completed_value_series || [];
  const firstName = user?.full_name?.split(' ')[0] || 'Admin';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-brand-600">Admin / Dashboard</p>
          <h1 className="mt-0.5 font-display text-[25px] font-bold tracking-tight text-ink sm:text-[29px]">Dashboard</h1>
          <p className="mt-0.5 text-[12px] text-muted">Welcome back, {firstName}. Here is what is moving on CampusLoop.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search listings"
              className="input-base h-9 pl-8 text-[12px]"
              aria-label="Search listing activity"
            />
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Live listings"
          value={stats?.approved_listings ?? '—'}
          hint={`${sumSeries(listingsSeries)} added in last ${KPI_DAYS} days`}
          icon={Tag}
          points={toPoints(listingsSeries, 'count')}
          accent="brand"
        />
        <StatCard
          label="Pending review"
          value={stats?.pending_listings ?? '—'}
          hint={`${stats?.pending_verifications ?? 0} students awaiting verification`}
          icon={Clock3}
          points={toPoints(pendingSeries, 'count')}
          accent="info"
        />
        <StatCard
          label="Listing views"
          value={stats?.total_listing_views ?? '—'}
          hint={`Across ${stats?.total_listings ?? 0} submitted listings`}
          icon={Eye}
          points={toPoints(viewsSeries, 'value')}
          accent="navy"
        />
        <StatCard
          label="Registered members"
          value={stats?.total_users ?? '—'}
          hint={`${stats?.verified_students ?? 0} verified students`}
          icon={Users}
          points={toPoints(usersSeries, 'count')}
          accent="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_318px] xl:items-start">
        <div className="min-w-0 space-y-4">
          <AdminTrendCharts
            listingSeries={usageListingSeries}
            transactionSeries={usageTransactionSeries}
            valueSeries={valueSeries}
            usageDays={usageDays}
            revenueDays={revenueDays}
            onUsageDaysChange={setUsageDays}
            onRevenueDaysChange={setRevenueDays}
            usageLoading={!usageData && !!analyticsLoading[usageDays]}
            revenueLoading={!revenueData && !!analyticsLoading[revenueDays]}
          />

          <div className="grid items-stretch gap-4 lg:grid-cols-[1.08fr_1fr]">
            <section className="surface-card flex h-full min-w-0 flex-col p-4 sm:p-5">
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">Listing categories</h2>
                  <p className="mt-0.5 text-[10.5px] text-muted">Live and sold listings by category</p>
                </div>
                <Link to="/admin/listings" className="text-[10px] font-semibold text-brand-600">All listings</Link>
              </div>
              <CategoryBars items={baseline.listings_by_category} />
            </section>

            <section className="surface-card flex h-full min-w-0 flex-col p-4 sm:p-5">
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">Listing status</h2>
                  <p className="mt-0.5 text-[10.5px] text-muted">Every submitted listing</p>
                </div>
                <Link to="/admin/listing-health" className="text-[10px] font-semibold text-brand-600">Health</Link>
              </div>
              <StatusDonut items={baseline.listings_by_status} />
            </section>
          </div>

          <OfferPipeline items={baseline.offers_by_status} />
        </div>

        <aside className="min-w-0 space-y-4 xl:row-span-2 xl:self-start xl:sticky xl:top-[90px]">
          <section className="surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-ink">Popular listings</h2>
              <span className="inline-flex h-7 items-center rounded-[7px] border border-line bg-elevated px-2 text-[9px] font-medium text-ink">
                By views
              </span>
            </div>
            {popularListings.length ? (
              <ul className="mt-3 space-y-2.5">
                {popularListings.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/product/${item.id}`}
                      className="flex gap-2.5 rounded-[9px] border border-line bg-canvas p-2 transition hover:border-brand-200"
                    >
                      <ProductImage src={item.cover_image} alt={item.title} className="h-[76px] w-[56px] shrink-0 rounded-[5px]" />
                      <span className="min-w-0 flex-1 py-0.5">
                        <span className="block truncate text-[9px] text-muted">{item.seller_name}</span>
                        <span className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-ink">{item.title}</span>
                        <span className="mt-1.5 flex items-center gap-1 text-[9px] text-muted">
                          <Eye size={10} /> {Number(item.views_count || 0).toLocaleString('en-IN')} views
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[11px] text-muted">No listings yet.</p>
            )}
            <Link to="/admin/listings" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">
              View all listings <ChevronRight size={11} />
            </Link>
          </section>

          <section className="surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-ink">Top sellers</h2>
              <span className="inline-flex h-7 items-center rounded-[7px] border border-line bg-elevated px-2 text-[9px] font-medium text-ink">
                By deal value
              </span>
            </div>
            {topSellers.length ? (
              <ul className="mt-3 divide-y divide-line">
                {topSellers.map((seller) => (
                  <li key={seller.id} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <Avatar name={seller.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-ink">{seller.name}</span>
                      <span className="block text-[9px] text-muted">
                        {seller.deals} deal{seller.deals === 1 ? '' : 's'} · {seller.completed} completed
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[10px] font-semibold text-ink">{inr(seller.value)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[11px] text-muted">No deals recorded yet.</p>
            )}
            <Link to="/admin/transactions" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">
              Open deal flow <ChevronRight size={11} />
            </Link>
          </section>

          <section className="surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-ink">Recent activities</h2>
              <span className="inline-flex h-7 items-center rounded-[7px] border border-line bg-elevated px-2 text-[9px] font-medium text-ink">
                Latest
              </span>
            </div>
            {activityFeed.length ? (
              <ul className="mt-3 space-y-3">
                {activityFeed.map((event) => {
                  const Icon = event.icon;
                  return (
                    <li key={event.id}>
                      <Link to={event.to} className="flex gap-2.5 transition hover:opacity-75">
                        <span className="dashboard-card-icon mt-0.5 h-7 w-7 rounded-full">
                          <Icon size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10.5px] font-semibold text-ink">{event.title}</span>
                          <span className="mt-0.5 line-clamp-2 block text-[9.5px] leading-snug text-muted">{event.detail}</span>
                          <span className="mt-1 block text-[8.5px] text-muted/80">{timeAgo(event.at)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-[11px] text-muted">No recent activity.</p>
            )}
          </section>
        </aside>

        <section className="surface-card flex min-w-0 flex-col overflow-hidden xl:col-start-1 xl:h-[500px]">
          <div className="flex shrink-0 flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Listing activity</h2>
              <p className="mt-0.5 text-[10.5px] text-muted">Latest listings and their moderation state</p>
            </div>
            <Link to="/admin/listings" className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">
              Manage listings <ChevronRight size={11} />
            </Link>
          </div>

          {filteredListings.length ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-line bg-[#F6F4F1] text-[9.5px] uppercase tracking-[0.06em] text-muted dark:bg-elevated">
                    <th className="px-4 py-2.5 font-semibold">Listing</th>
                    <th className="px-4 py-2.5 font-semibold">Seller</th>
                    <th className="px-4 py-2.5 font-semibold">Category</th>
                    <th className="px-4 py-2.5 font-semibold">Price</th>
                    <th className="px-4 py-2.5 font-semibold">Views</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Listed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredListings.slice(0, 8).map((item) => (
                    <tr key={item.id} className="text-[11.5px]">
                      <td className="px-4 py-2.5">
                        <Link to={`/product/${item.id}`} className="flex items-center gap-2.5">
                          <ProductImage src={item.cover_image} alt={item.title} className="h-[40px] w-[31px] shrink-0 rounded-[4px]" />
                          <span className="min-w-0">
                            <span className="block max-w-[190px] truncate font-semibold text-ink">{item.title}</span>
                            <span className="block max-w-[190px] truncate text-[9.5px] text-muted">{item.condition?.replace(/_/g, ' ')}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={item.seller_name} size="xs" />
                          <div className="min-w-0">
                            <p className="max-w-[130px] truncate font-medium text-ink">{item.seller_name}</p>
                            <p className="max-w-[130px] truncate text-[9px] text-muted">{item.seller_college}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted">{item.category_name || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-ink">{inr(item.price)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted">{Number(item.views_count || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge map={PRODUCT_STATUS} value={item.status} size="xs" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-[9.5px] text-muted">
                        {formatDateTime(item.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                icon={Search}
                title={query ? 'No matching listings' : 'No listing activity yet'}
                description={query ? 'Try a different title, seller or category.' : 'New listings will appear here.'}
              />
            </div>
          )}

          <div className="flex shrink-0 flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-muted">
              Showing {Math.min(filteredListings.length, 8)} of {listings.total || filteredListings.length} listings
            </p>
            <Link to="/admin/listing-health" className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">
              Open listing health <ChevronRight size={11} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
