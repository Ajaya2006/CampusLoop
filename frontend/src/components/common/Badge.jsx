import { BadgeCheck } from 'lucide-react';
import { cx } from '../../utils/format';

const TONES = {
  neutral: 'bg-elevated text-muted border-line',
  brand: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:border-brand-800',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  info: 'bg-accent/10 text-accent border-accent/25',
};

export default function Badge({ tone = 'neutral', children, icon: Icon, className = '', size = 'sm' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {Icon ? <Icon size={size === 'xs' ? 10 : 12} aria-hidden /> : null}
      {children}
    </span>
  );
}

export function VerifiedBadge({ status, compact = false }) {
  if (status === 'verified') {
    return (
      <Badge tone="success" icon={BadgeCheck} size={compact ? 'xs' : 'sm'}>
        Verified student
      </Badge>
    );
  }
  if (status === 'pending') return <Badge tone="warning" size={compact ? 'xs' : 'sm'}>Verification pending</Badge>;
  if (status === 'rejected') return <Badge tone="danger" size={compact ? 'xs' : 'sm'}>Verification rejected</Badge>;
  return <Badge tone="neutral" size={compact ? 'xs' : 'sm'}>Not verified</Badge>;
}

export function StatusBadge({ map, value, ...props }) {
  const entry = map[value] || { label: value, tone: 'neutral' };
  return (
    <Badge tone={entry.tone} {...props}>
      {entry.label}
    </Badge>
  );
}
