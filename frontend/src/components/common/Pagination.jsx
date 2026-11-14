import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '../../utils/format';

function pageItems(page, pages) {
  if (pages <= 1) return [];
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);

  const values = [...new Set([1, pages, page - 1, page, page + 1])]
    .filter((value) => value >= 1 && value <= pages)
    .sort((a, b) => a - b);

  const items = [];
  values.forEach((value, index) => {
    if (index && value - values[index - 1] > 1) items.push('ellipsis');
    items.push(value);
  });
  return items;
}

export default function Pagination({ page, pages, onChange, className = '' }) {
  const items = pageItems(page, pages);

  return (
    <nav className={cx('flex items-center justify-center gap-1', className)} aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-muted transition hover:bg-elevated hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="inline-flex h-8 w-6 items-center justify-center text-xs text-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cx(
              'inline-flex h-8 min-w-8 items-center justify-center rounded-[7px] px-2 text-[12px] font-semibold transition',
              item === page
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-muted hover:bg-elevated hover:text-ink',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-muted transition hover:bg-elevated hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
