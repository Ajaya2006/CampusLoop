import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import GlassBackdrop from '../glass/GlassBackdrop';

/**
 * The signature selection capsule.
 *
 * It measures the active item inside `containerRef` and animates its own
 * transform/width to sit behind it, so the glass container never moves while
 * the highlight travels. Measurements are refreshed on resize and on any
 * change of `dependencies` (route, tab list, fonts loading).
 */
export default function LiquidActiveIndicator({ containerRef, index, dependencies = [], selector = '[data-nav-item]' }) {
  const [box, setBox] = useState({ left: 0, width: 0, ready: false });
  const retry = useRef({ frames: 0 });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = container.querySelectorAll(selector);
    const target = items[index];
    if (!target) return;

    // A nav that mounted inside a hidden breakpoint has no layout yet; keep
    // asking for a frame or two until it gains width.
    if (!target.offsetWidth && retry.current.frames < 20) {
      retry.current.frames += 1;
      requestAnimationFrame(measure);
      return;
    }

    retry.current.frames = 0;
    const next = { left: target.offsetLeft, width: target.offsetWidth, ready: true };
    setBox((current) =>
      current.left === next.left && current.width === next.width && current.ready === next.ready ? current : next,
    );
  }, [containerRef, index, selector]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    const mutations = new MutationObserver(measure);
    mutations.observe(container, { childList: true, subtree: true });

    window.addEventListener('resize', measure);
    // Re-measure once webfonts settle; label widths change with the font swap.
    document.fonts?.ready?.then(measure).catch(() => {});
    const frame = requestAnimationFrame(measure);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, containerRef, ...dependencies]);

  return (
    <div
      aria-hidden="true"
      className="liquid-indicator"
      style={{
        transform: `translate3d(${box.left}px, 0, 0)`,
        width: box.width ? `${box.width}px` : '0px',
        opacity: box.ready ? 1 : 0,
      }}
    >
      {/* The capsule carries the same glass as the bar it sits in, so the
          highlight reads as a second piece of liquid rather than a flat tile. */}
      <GlassBackdrop blur={5} />
    </div>
  );
}
