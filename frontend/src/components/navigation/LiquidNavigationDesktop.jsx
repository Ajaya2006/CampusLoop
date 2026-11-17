import { useRef } from 'react';
import LiquidActiveIndicator from './LiquidActiveIndicator';
import LiquidNavItem from './LiquidNavItem';

/** Floating horizontal capsule used from the tablet breakpoint up. */
export default function LiquidNavigationDesktop({ items, activeIndex }) {
  const containerRef = useRef(null);

  return (
    <nav className="liquid-nav-desktop liquid-glass liquid-glass-nav" aria-label="Main navigation">
      <div className="liquid-nav" ref={containerRef}>
        <LiquidActiveIndicator
          containerRef={containerRef}
          index={activeIndex}
          dependencies={[items.length, activeIndex]}
        />
        {items.map((item, index) => (
          <LiquidNavItem
            key={item.key}
            to={item.to}
            label={item.label}
            icon={item.icon}
            badge={item.badge}
            active={index === activeIndex}
          />
        ))}
      </div>
    </nav>
  );
}
