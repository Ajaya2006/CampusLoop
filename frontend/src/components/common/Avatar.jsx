import { initials } from '../../utils/format';

const SIZES = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export default function Avatar({ name = '', src, size = 'md', className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700 ring-1 ring-inset ring-brand-200/60 dark:bg-brand-900/50 dark:text-brand-100 dark:ring-brand-800 ${SIZES[size] || SIZES.md} ${className}`}
      aria-hidden={!name}
      title={name}
    >
      {src ? (
        <img src={src} alt={name ? `${name}'s avatar` : 'Avatar'} className="h-full w-full object-cover" />
      ) : (
        name ? initials(name) : '?'
      )}
    </span>
  );
}
