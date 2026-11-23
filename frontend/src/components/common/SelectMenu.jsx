import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import GlassPopover from './GlassPopover';
import { cx } from '../../utils/format';

/**
 * Custom dropdown that replaces the native <select>.
 *
 * Options may be flat (`{ value, label }`) or grouped
 * (`{ label: 'Electronics', options: [...] }`). It emits the familiar
 * `{ target: { value, name } }` shape so every existing controlled form keeps
 * working unchanged, and the panel is a portalled glass popover so it is never
 * clipped by a scrolling card or a frosted ancestor.
 */
const SelectMenu = forwardRef(function SelectMenu(
  {
    value,
    onChange,
    options = [],
    placeholder = 'Select an option',
    name,
    id,
    error = false,
    disabled = false,
    required = false,
    size,
    className = '',
    buttonClassName = '',
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  const groups = useMemo(() => {
    let index = 0;
    return options.reduce((out, entry) => {
      if (!entry) return out;
      if (Array.isArray(entry.options)) {
        out.push({
          label: entry.label,
          items: entry.options
            .filter(Boolean)
            .map((option) => ({ ...option, index: index++ })),
        });
      } else {
        out.push({ label: null, items: [{ ...entry, index: index++ }] });
      }
      return out;
    }, []);
  }, [options]);

  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const selectedIndex = flat.findIndex((option) => String(option.value ?? '') === String(value ?? ''));
  const selected = selectedIndex >= 0 ? flat[selectedIndex] : null;

  const setTriggerRef = (element) => {
    triggerRef.current = element;
    if (typeof ref === 'function') ref(element);
    else if (ref) ref.current = element;
  };

  const openMenu = useCallback(
    (index) => {
      if (disabled) return;
      setActive(typeof index === 'number' ? index : Math.max(0, selectedIndex));
      setOpen(true);
    },
    [disabled, selectedIndex],
  );

  const commit = (option) => {
    setOpen(false);
    if (!option) return;
    if (String(option.value ?? '') !== String(value ?? '')) {
      onChange?.({ target: { value: option.value, name } });
    }
    triggerRef.current?.focus();
  };

  const onKeyDown = (event) => {
    if (disabled) return;

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu(event.key === 'ArrowDown' ? Math.max(0, selectedIndex) : selectedIndex >= 0 ? selectedIndex : flat.length - 1);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(flat.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(flat.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      commit(flat[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) {
      optionRefs.current = [];
      return;
    }
    if (active >= 0) optionRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  return (
    <div className={cx('relative', className)}>
      <button
        ref={setTriggerRef}
        type="button"
        id={id}
        disabled={disabled}
        data-open={open ? 'true' : 'false'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        aria-invalid={error || undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={cx(
          'input-base select-trigger flex w-full items-center justify-between gap-2',
          size === 'sm' && 'select-trigger--sm',
          error && 'border-danger',
          disabled && 'cursor-not-allowed opacity-60',
          buttonClassName,
        )}
        {...rest}
      >
        <span className={cx('truncate', !selected && 'text-muted/80')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          aria-hidden
          className={cx('shrink-0 text-muted transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <GlassPopover
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        role="listbox"
        align="start"
        offset={6}
        matchWidth
        className="select-menu cl-scroll"
      >
        {groups.map((group, groupIndex) => (
          <div key={group.label || `group-${groupIndex}`} role="group" aria-label={group.label || undefined}>
            {group.label ? <p className="select-group-label">{group.label}</p> : null}
            {group.items.map((option) => {
              const isSelected = option.index === selectedIndex;
              return (
                <button
                  key={`${option.value}-${option.index}`}
                  ref={(element) => {
                    optionRefs.current[option.index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected ? 'true' : 'false'}
                  data-active={option.index === active ? 'true' : 'false'}
                  onMouseEnter={() => setActive(option.index)}
                  onClick={() => commit(option)}
                  className="select-option"
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <span className="select-option__mark">
                      <Check size={11} aria-hidden />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </GlassPopover>
    </div>
  );
});

export default SelectMenu;
