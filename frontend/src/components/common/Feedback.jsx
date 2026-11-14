import { AlertTriangle, Loader2, PackageOpen, RefreshCw } from 'lucide-react';
import { cx } from '../../utils/format';
import Button from './Button';

export function Spinner({ size = 20, className = '' }) {
  return <Loader2 size={size} className={cx('animate-spin text-brand-500', className)} aria-hidden />;
}

export function LoadingPage({ label = 'Loading…' }) {
  return (
    <div className="animate-fade-in space-y-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2.5 text-sm text-muted">
        <Spinner size={18} />
        <p>{label}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="surface-card skeleton-row p-4"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="mt-4 h-6 w-24" />
            <Skeleton className="mt-3 h-9 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <div className="surface-card p-5">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-52 w-full rounded-xl" />
        </div>
        <div className="surface-card space-y-3 p-5">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={cx('skeleton', className)} aria-hidden />;
}

export function ProductCardSkeleton() {
  return (
    <div className="skeleton-row min-w-0">
      <Skeleton className="aspect-[4/5] w-full rounded-[10px]" />
      <div className="mt-2.5 space-y-2 px-0.5">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="surface-card skeleton-row flex items-center gap-4 p-4"
          style={{ animationDelay: `${index * 55}ms` }}
        >
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = PackageOpen, title, description, action, className = '' }) {
  return (
    <div className={cx('flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-14 text-center', className)}>
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon size={24} aria-hidden />
      </span>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className = '' }) {
  return (
    <div className={cx('flex flex-col items-center justify-center rounded-card border border-danger/20 bg-danger/5 px-6 py-12 text-center', className)}>
      <AlertTriangle className="mb-3 text-danger" size={26} />
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {message ? <p className="mt-1.5 max-w-md text-sm text-muted">{message}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" icon={RefreshCw} className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function InlineAlert({ tone = 'info', title, children, className = '' }) {
  const tones = {
    info: 'border-accent/25 bg-accent/5 text-accent',
    warning: 'border-warning/30 bg-warning/5 text-warning',
    danger: 'border-danger/25 bg-danger/5 text-danger',
    success: 'border-success/25 bg-success/5 text-success',
  };
  return (
    <div className={cx('rounded-control border px-4 py-3 text-sm', tones[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? 'mt-0.5' : ''}>{children}</div> : null}
    </div>
  );
}
