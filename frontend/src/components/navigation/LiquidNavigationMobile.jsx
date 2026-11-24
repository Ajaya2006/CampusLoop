import { useRef } from 'react';
import GlassBackdrop from '../glass/GlassBackdrop';
import LiquidActiveIndicator from './LiquidActiveIndicator';
import LiquidNavItem from './LiquidNavItem';

/** Floating bottom capsule with the same indicator and active logic. */
export default function LiquidNavigationMobile({ items, activeIndex }) {
  const containerRef = useRef(null);

  return (
    <nav className="liquid-nav-mobile liquid-glass-nav" aria-label="Primary">
      {/* Floating chrome over live page content: the reference's `regular` glass. */}
      <GlassBackdrop blur={7} displace={0.45} backgroundOpacity={0.08} effect="regular" />
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
            compact
          />
        ))}
      </div>
    </nav>
  );
}
