import { useEffect, useMemo, useRef, useState } from 'react';
import { inr, parseDate } from '../../utils/format';
import { useCountUp, useReplayKey } from '../../hooks/useChartMotion';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PERIODS = [
  { label: 'Last Week', value: 7 },
  { label: 'Last Month', value: 30 },
  { label: 'Last Quarter', value: 90 },
];

function compactInr(value) {
  const amount = Number(value || 0);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(amount >= 100000000 ? 0 : 1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(amount >= 1000000 ? 0 : 1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `₹${amount.toLocaleString('en-IN')}`;
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

function formatDayDate(value) {
  const date = parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'Date unavailable';
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMonthDate(value) {
  const date = parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return MONTHS_SHORT[date.getMonth()];
}

function formatShortDate(value) {
  const date = parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20">
      <path d="m4 7 6 6 6-6" />
    </svg>
  );
}

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

function PeriodSelect({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const shellRef = useRef(null);
  const current = PERIODS.find((option) => option.value === value) || PERIODS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event) => {
      if (!shellRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <div className="period-select" data-open={open} ref={shellRef}>
      <button
        type="button"
        className="period-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        {current.label}
        <Chevron />
      </button>

      {open ? (
        <ul className="period-menu" role="listbox" aria-label={label}>
          {PERIODS.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                className="period-option"
                data-active={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
                {option.value === value ? <Check /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function buildUsageBuckets(listingSeries = [], transactionSeries = []) {
  const rows = new Map();
  const add = (series, key) => {
    (series || []).forEach((point) => {
      if (!point?.date) return;
      const current = rows.get(point.date) || { listings: 0, deals: 0 };
      current[key] += Number(point.count || 0);
      rows.set(point.date, current);
    });
  };
  add(listingSeries, 'listings');
  add(transactionSeries, 'deals');

  const dates = [...rows.keys()].sort();
  if (!dates.length) return [];

  const bucketCount = Math.min(7, dates.length);
  return Array.from({ length: bucketCount }, (_, index) => {
    const start = Math.floor((index * dates.length) / bucketCount);
    const end = Math.floor(((index + 1) * dates.length) / bucketCount);
    const slice = dates.slice(start, Math.max(end, start + 1));
    const date = slice[slice.length - 1];
    return {
      day: formatDayDate(date).split(',')[0],
      date: formatDayDate(date),
      visitors: slice.reduce((sum, item) => sum + rows.get(item).listings, 0),
      borrowers: slice.reduce((sum, item) => sum + rows.get(item).deals, 0),
    };
  });
}

function buildRevenueBuckets(series = [], count = 8) {
  const rows = new Map();
  (series || []).forEach((point) => {
    if (!point?.date) return;
    rows.set(point.date, (rows.get(point.date) || 0) + Number(point.value || 0));
  });

  const dates = [...rows.keys()].sort();
  if (!dates.length) return [];

  const bucketCount = Math.min(count, dates.length);
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = Math.floor((index * dates.length) / bucketCount);
    const end = Math.floor(((index + 1) * dates.length) / bucketCount);
    const slice = dates.slice(start, Math.max(end, start + 1));
    return {
      date: slice[slice.length - 1],
      value: slice.reduce((sum, item) => sum + rows.get(item), 0),
    };
  });

  const monthLabels = buckets.map((bucket) => formatMonthDate(bucket.date));
  const monthsAreUnique = new Set(monthLabels).size === monthLabels.length;

  return buckets.map((bucket, index) => ({
    ...bucket,
    month: monthsAreUnique ? monthLabels[index] : formatShortDate(bucket.date),
  }));
}

function EmptyChart({ title }) {
  return (
    <div className="chart-empty">
      <strong>No activity in this window</strong>
      <span>{title} will appear here as soon as there is data.</span>
    </div>
  );
}

function RevenueChart({ series, days, onDaysChange }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const buckets = useMemo(() => buildRevenueBuckets(series, days <= 7 ? 7 : days <= 30 ? 6 : 8), [days, series]);
  const totalValue = buckets.reduce((sum, item) => sum + item.value, 0);
  // Replays the bar growth whenever the series or the period changes.
  const replay = useReplayKey(`${days}:${buckets.map((item) => item.value).join(',')}`);
  const animatedTotal = useCountUp(totalValue, { duration: 760 });
  const maxValue = Math.max(1, ...buckets.map((item) => item.value));
  const axisMax = niceCeil(maxValue);
  const yAxis = [1, 0.75, 0.5, 0.25, 0].map((ratio) => compactInr(axisMax * ratio));
  const peakIndex = buckets.reduce((best, item, index) => (item.value > buckets[best].value ? index : best), 0);
  const safeActive = !buckets.length
    ? -1
    : activeIndex === null
      ? peakIndex
      : Math.min(activeIndex, buckets.length - 1);

  return (
    <section className="chart-card revenue-card" aria-labelledby="revenue-title">
      <header className="card-header">
        <h2 id="revenue-title">Revenue</h2>
        <PeriodSelect label="Revenue period" value={days} onChange={onDaysChange} />
      </header>

      <div className="legend" aria-label="Revenue summary">
        <span>
          Completed deal value
          <b className="legend-value">{inr(Math.round(animatedTotal))}</b>
        </span>
      </div>

      {buckets.length ? (
        <div className="revenue-plot">
          <div className="y-axis" aria-hidden="true">
            {yAxis.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="revenue-graph">
            <div className="grid-lines" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <i key={index} />
              ))}
            </div>
            <div className="revenue-bars" key={`revenue-${days}-${replay}`} onMouseLeave={() => setActiveIndex(null)}>
              {buckets.map((item, index) => {
                const active = safeActive === index;
                return (
                  <button
                    className={`revenue-column ${active ? 'is-active' : ''}`}
                    key={`${item.date}-${index}`}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    onBlur={() => setActiveIndex(null)}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`${item.month} revenue: ${inr(item.value)}`}
                    style={{
                      '--bar-height': `${Math.min(100, (item.value / axisMax) * 100)}%`,
                      '--chart-index': index,
                      width: `${100 / buckets.length}%`,
                    }}
                  >
                    <span className="revenue-value">{inr(item.value)}</span>
                    <span className="revenue-fill" aria-hidden="true" />
                    <span className="revenue-month">{item.month}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <EmptyChart title="Completed deal revenue" />
      )}
    </section>
  );
}

function Legend() {
  return (
    <div className="legend" aria-label="Chart legend">
      <span>
        <i className="legend-swatch visitors-swatch" />
        Listings added
      </span>
      <span>
        <i className="legend-swatch borrowers-swatch" />
        Deals started
      </span>
    </div>
  );
}

function UsageChart({ listingSeries, transactionSeries, days, onDaysChange }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const usage = useMemo(() => buildUsageBuckets(listingSeries, transactionSeries), [listingSeries, transactionSeries]);
  const replay = useReplayKey(`${days}:${usage.map((item) => `${item.visitors}/${item.borrowers}`).join(',')}`);
  const maxValue = Math.max(1, ...usage.map((item) => Math.max(item.visitors, item.borrowers)));
  const axisMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
  const yAxis = [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(axisMax * ratio));
  const safeActive = activeIndex === null || !usage.length ? -1 : Math.min(activeIndex, usage.length - 1);

  return (
    <section className="chart-card usage-card" aria-labelledby="usage-title">
      <header className="card-header">
        <h2 id="usage-title">Marketplace Usage Trends</h2>
        <PeriodSelect label="Marketplace usage period" value={days} onChange={onDaysChange} />
      </header>
      <Legend />

      {usage.length ? (
        <div className="usage-plot">
          <div className="y-axis usage-y-axis" aria-hidden="true">
            {yAxis.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="usage-graph">
            <div className="grid-lines" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <i key={index} />
              ))}
            </div>

            <div className="usage-bars" key={`usage-${days}-${replay}`} onMouseLeave={() => setActiveIndex(null)}>
              {usage.map((item, index) => {
                const active = safeActive === index;
                const outerValue = Math.max(item.visitors, item.borrowers);
                const outerHeight = (outerValue / axisMax) * 100;
                const innerHeight = outerValue ? (item.borrowers / outerValue) * 100 : 0;
                return (
                  <button
                    className={`usage-column ${active ? 'is-active' : ''}`}
                    key={`${item.date}-${index}`}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    onBlur={() => setActiveIndex(null)}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`${item.date}: ${item.visitors} listings added and ${item.borrowers} deals started`}
                    style={{ '--chart-index': index }}
                  >
                    <span
                      className="visitor-bar"
                      style={{ '--bar-height': `${outerHeight}%` }}
                      aria-hidden="true"
                    >
                      <span
                        className="borrower-bar"
                        style={{ '--bar-height': `${innerHeight}%` }}
                      />
                    </span>
                    <span className="usage-day">{item.day}</span>
                    <span className="usage-tooltip" role="tooltip">
                      <strong>{item.date}</strong>
                      <span>
                        <i className="legend-swatch visitors-swatch" />
                        Listings added <b>{item.visitors}</b>
                      </span>
                      <span>
                        <i className="legend-swatch borrowers-swatch" />
                        Deals started <b>{item.borrowers}</b>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <EmptyChart title="Marketplace usage" />
      )}
    </section>
  );
}

export default function AdminTrendCharts({
  listingSeries,
  transactionSeries,
  valueSeries,
  days,
  onDaysChange,
}) {
  return (
    <div className="admin-trend-charts">
      <UsageChart
        listingSeries={listingSeries}
        transactionSeries={transactionSeries}
        days={days}
        onDaysChange={onDaysChange}
      />
      <RevenueChart series={valueSeries} days={days} onDaysChange={onDaysChange} />
    </div>
  );
}
