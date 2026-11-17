import { useMemo, useRef } from 'react';
import LiquidActiveIndicator from './LiquidActiveIndicator';

/**
 * Segmented control with the same travelling indicator as the main navigation.
 * Tabs are data-driven: pass any `{ value, label, count?, icon? }` list.
 */
export default function LiquidTabBar({ items, value, onChange, ariaLabel = 'Section', className = '' }) {
  const containerRef = useRef(null);
  const activeIndex = useMemo(() => {
    const index = items.findIndex((item) => item.value === value);
    return index === -1 ? 0 : index;
  }, [items, value]);

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = (activeIndex + delta + items.length) % items.length;
    onChange(items[next].value);
    const buttons = containerRef.current?.querySelectorAll('[role="tab"]');
    buttons?.[next]?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`liquid-tabs ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <LiquidActiveIndicator
        containerRef={containerRef}
        index={activeIndex}
        dependencies={[items.map((item) => item.value).join(','), activeIndex]}
        selector='[role="tab"]'
      />

      {items.map((item) => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-active={active ? 'true' : 'false'}
            onClick={() => onChange(item.value)}
            className="liquid-tabs__tab"
          >
            {Icon ? <Icon size={14} aria-hidden /> : null}
            {item.label}
            {typeof item.count === 'number' ? <span className="liquid-tabs__count">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
