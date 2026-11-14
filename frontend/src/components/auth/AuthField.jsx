import { AlertCircle } from 'lucide-react';
import { cx } from '../../utils/format';

export default function AuthField({
  label,
  icon: Icon,
  error,
  hint,
  action,
  required,
  id,
  className = '',
  ...props
}) {
  const fieldId = id || props.name;

  return (
    <div className={className}>
      {label ? (
        <label className="auth-label" htmlFor={fieldId}>
          {label} {required ? <span className="text-danger">*</span> : null}
        </label>
      ) : null}

      <div className="auth-control" data-invalid={error ? 'true' : 'false'}>
        {Icon ? <Icon size={16} className="auth-control-icon" aria-hidden /> : null}
        <input
          id={fieldId}
          className={cx('auth-input', Icon && 'has-icon', action && 'has-action')}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {action}
      </div>

      {error ? (
        <p className="auth-error">
          <AlertCircle size={12} /> {error}
        </p>
      ) : hint ? (
        <p className="auth-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function AuthSelect({ label, error, hint, required, id, className = '', children, ...props }) {
  const fieldId = id || props.name;

  return (
    <div className={className}>
      {label ? (
        <label className="auth-label" htmlFor={fieldId}>
          {label} {required ? <span className="text-danger">*</span> : null}
        </label>
      ) : null}

      <div className="auth-control" data-invalid={error ? 'true' : 'false'}>
        <select id={fieldId} className="auth-input appearance-none pr-8" {...props}>
          {children}
        </select>
      </div>

      {error ? (
        <p className="auth-error">
          <AlertCircle size={12} /> {error}
        </p>
      ) : hint ? (
        <p className="auth-hint">{hint}</p>
      ) : null}
    </div>
  );
}
