import { cx } from '../../utils/format';

export default function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div
      className={cx('no-scrollbar flex gap-1 overflow-x-auto rounded-control border border-line bg-surface p-1', className)}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition',
              active ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:bg-elevated hover:text-ink',
            )}
          >
            {item.label}
            {typeof item.count === 'number' ? (
              <span className={cx('rounded-full px-1.5 text-[11px]', active ? 'bg-white/20' : 'bg-elevated text-muted')}>
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
