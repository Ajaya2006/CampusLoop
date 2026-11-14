import { cx } from '../../utils/format';

/**
 * Shared floating tooltip for the dashboard charts.
 * Position it with percentage coordinates relative to the chart container
 * (x is the horizontal centre, y the anchor point the tip floats above).
 */
export default function ChartTooltip({ open, x = 50, y = 50, className = '', children }) {
  return (
    <span
      className={cx('chart-tip', open && 'is-open', className)}
      style={{ left: `${x}%`, top: `${y}%` }}
      role="tooltip"
      aria-hidden={open ? undefined : 'true'}
    >
      {children}
    </span>
  );
}
