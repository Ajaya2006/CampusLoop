import { Children, forwardRef, isValidElement } from 'react';
import { AlertCircle } from 'lucide-react';
import SelectMenu from './SelectMenu';
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

/* Turn declarative <option>/<optgroup> children into the option lists the custom
   dropdown takes, so existing call sites keep their markup. */
function childrenToOptions(children) {
  const out = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === 'optgroup') {
      out.push({ label: child.props.label, options: childrenToOptions(child.props.children) });
    } else if (child.type === 'option') {
      out.push({
        value: child.props.value ?? (typeof child.props.children === 'string' ? child.props.children : ''),
        label: child.props.children,
        disabled: child.props.disabled,
      });
    }
  });
  return out;
}

export const Select = forwardRef(function Select(
  { label, error, hint, className = '', id, children, required, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <SelectMenu
        ref={ref}
        id={inputId}
        options={childrenToOptions(children)}
        error={Boolean(error)}
        required={required}
        {...props}
      />
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
