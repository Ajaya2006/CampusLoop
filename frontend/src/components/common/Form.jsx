import { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { cx } from '../../utils/format';

export function Field({ label, htmlFor, error, hint, required, className = '', children }) {
  return (
    <div className={className}>
      {label ? (
        <label className="label-base" htmlFor={htmlFor}>
          {label} {required ? <span className="text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
          <AlertCircle size={12} /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const baseInput = 'input-base';

export const Input = forwardRef(function Input(
  { label, error, hint, className = '', id, required, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <input
        ref={ref}
        id={inputId}
        className={cx(baseInput, error && 'border-danger focus:border-danger focus:ring-danger/20')}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', id, rows = 4, required, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={cx(baseInput, 'resize-y', error && 'border-danger focus:border-danger')}
        {...props}
      />
    </Field>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, className = '', id, children, required, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <select ref={ref} id={inputId} className={cx(baseInput, 'pr-8', error && 'border-danger')} {...props}>
        {children}
      </select>
    </Field>
  );
});

export function Checkbox({ label, description, className = '', ...props }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5 text-sm', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-500/40"
        {...props}
      />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  );
}
