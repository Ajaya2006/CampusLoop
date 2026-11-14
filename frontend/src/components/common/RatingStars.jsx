import { Star } from 'lucide-react';
import { cx } from '../../utils/format';

export default function RatingStars({ value = 0, size = 14, showValue = false, count, className = '' }) {
  return (
    <span className={cx('inline-flex items-center gap-1', className)} aria-label={`Rating ${value} out of 5`}>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={star <= Math.round(value) ? 'fill-warning text-warning' : 'text-line'}
            aria-hidden
          />
        ))}
      </span>
      {showValue ? (
        <span className="text-xs font-medium text-ink">
          {Number(value || 0).toFixed(1)}
          {typeof count === 'number' ? <span className="ml-1 font-normal text-muted">({count})</span> : null}
        </span>
      ) : null}
    </span>
  );
}
