import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { trendOf } from '../../utils/series';

function smoothPath(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const points = values.map((value, index) => ({
    x: (index / Math.max(1, values.length - 1)) * 100,
    y: range ? 36 - ((value - min) / range) * 32 : 20,
  }));

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] || points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] || next;
    const controlOneX = current.x + (next.x - previous.x) / 6;
    const controlOneY = current.y + (next.y - previous.y) / 6;
    const controlTwoX = next.x - (afterNext.x - current.x) / 6;
    const controlTwoY = next.y - (afterNext.y - current.y) / 6;
    path += ` C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${next.x} ${next.y}`;
  }
  return { line: path, area: `${path} L 100 40 L 0 40 Z` };
}

function Sparkline({ points, label }) {
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const values = points.length > 1 ? points : [points[0] || 0, points[0] || 0];
  const { line, area } = smoothPath(values);

  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="stat-sparkline w-full"
      role="img"
      aria-label={`${label} trend`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path className="chart-area" d={area} fill={`url(#${gradientId})`} />
      <path
        className="chart-line"
        d={line}
        fill="none"
        pathLength="1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function StatCard({ label, value, icon: Icon, hint, to, points = [], accent = 'brand' }) {
  const trend = trendOf(points);
  const positive = trend !== null && trend >= 0;
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <span className="dashboard-card-icon h-8 w-8 shrink-0 rounded-full">
            <Icon size={14} strokeWidth={2} aria-hidden />
          </span>
        ) : null}
        <p className="min-w-0 flex-1 truncate text-[10.5px] font-semibold leading-tight text-muted">{label}</p>
        {trend !== null ? (
          <span
            className={`inline-flex h-[16px] shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[9px] font-semibold ${
              positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            }`}
          >
            {positive ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
            {positive ? '+' : ''}{trend}%
          </span>
        ) : null}
      </div>

      <p className="mt-2 min-w-0 truncate font-display text-[21px] font-bold leading-none tracking-tight text-ink">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </p>

      <div className="mt-2 min-w-0">
        <Sparkline points={points} label={label} />
      </div>

      {hint ? <p className="mt-1.5 truncate text-[9.5px] leading-tight text-muted">{hint}</p> : null}
    </>
  );

  const className = 'stat-card surface-card flex h-full min-w-0 flex-col p-3';

  if (to) {
    return (
      <Link
        to={to}
        data-accent={accent}
        className={`${className} transition hover:-translate-y-0.5 hover:shadow-lift`}
      >
        {content}
      </Link>
    );
  }
  return (
    <div data-accent={accent} className={className}>
      {content}
    </div>
  );
}
