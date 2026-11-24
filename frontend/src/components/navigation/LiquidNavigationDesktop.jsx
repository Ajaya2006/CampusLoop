import { useRef } from 'react';
import GlassBackdrop from '../glass/GlassBackdrop';
import useResponsiveNavigation from '../../hooks/useResponsiveNavigation';
import LiquidActiveIndicator from './LiquidActiveIndicator';
import LiquidNavItem from './LiquidNavItem';

/** Floating horizontal capsule used from the tablet breakpoint up. */
export default function LiquidNavigationDesktop({ items, activeIndex }) {
  const containerRef = useRef(null);
  // Re-measure when the layout crosses the breakpoint, not only on resize.
  const { isDesktop } = useResponsiveNavigation();

  return (
    <nav className="liquid-nav-desktop liquid-glass-nav" aria-label="Main navigation">
      <GlassBackdrop blur={7} displace={0.45} backgroundOpacity={0.08} />
      <div className="liquid-nav" ref={containerRef}>
        <LiquidActiveIndicator
          containerRef={containerRef}
          index={activeIndex}
          dependencies={[items.length, activeIndex, isDesktop]}
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
