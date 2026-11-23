import { Loader2 } from 'lucide-react';
import { cx } from '../../utils/format';

const VARIANTS = {
  primary:
    'bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300',
  secondary:
    'bg-elevated text-ink border border-line hover:border-brand-300 hover:text-brand-600 disabled:text-muted',
  outline:
    'border border-brand-200 bg-transparent text-brand-600 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-900/40',
  ghost: 'text-muted hover:bg-elevated hover:text-ink',
  danger: 'bg-danger text-white hover:bg-danger/90',
  success: 'bg-success text-white hover:bg-success/90',
};

const SIZES = {
  xs: 'h-8 px-3 text-xs gap-1.5',
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
};

export function buttonStyles({ variant = 'primary', size = 'md', block = false, className = '' } = {}) {
  return cx(
    /* Glass press: the button flexes under the finger and springs back, on the
       project's shared clock. */
    'inline-flex items-center justify-center rounded-control font-semibold transition duration-200 ease-spring active:scale-[0.97]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:cursor-not-allowed disabled:opacity-70',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    block && 'w-full',
    className,
  );
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, block, className })}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : Icon ? <Icon size={16} aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={16} aria-hidden /> : null}
    </button>
  );
}
