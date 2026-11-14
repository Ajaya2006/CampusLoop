import { Search, X } from 'lucide-react';
import { cx } from '../../utils/format';

export default function SearchBar({ value, onChange, onSubmit, placeholder = 'Search…', className = '', autoFocus = false }) {
  return (
    <form
      role="search"
      className={cx('relative flex items-center', className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value);
      }}
    >
      <Search size={17} className="pointer-events-none absolute left-3.5 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input-base h-11 pl-10 pr-10"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 rounded p-1 text-muted transition hover:text-ink"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      ) : null}
    </form>
  );
}
