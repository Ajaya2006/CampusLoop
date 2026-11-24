import './GlassSurface.css';

/**
 * CampusLoop liquid glass.
 *
 * A semi-transparent pane with a frosted blur, a lit rim, a soft specular
 * highlight, layered shadows and a gradient tint. Everything here is plain CSS,
 * so the browser composites it like any other backdrop-filter.
 *
 * This is the browser stand-in for Apple's `UIGlassEffect` as
 * `@callstack/liquid-glass` exposes it to React Native. That package is an
 * iOS-native module (it needs `react-native` and only ships `.ios.js` views), so
 * it cannot be installed in this Vite app. The native view's variants
 * (`tintColor`, `colorScheme`, `interactive`, `effect`) have no call site here,
 * so the material is fixed: only the size, radius, frost intensity, saturation
 * and blur are per-surface.
 *
 * The previous version bent the backdrop with an SVG `feDisplacementMap` chain
 * (and a WebGL fallback). That reads as real refraction, but it forces a
 * full-frame filter on every glass element, on every scroll and every hover —
 * which is what made the app feel laggy. The props that fed it (displacement,
 * channel offsets, renderer, blend mode) are gone; nothing used them.
 */

const GlassSurface = ({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  backgroundOpacity = 0.1,
  saturation = 1.4,
  blur = 8,
  className = '',
  style = {},
}) => {
  // The old `blur` was a gaussian stdDeviation on the displacement map, so it
  // was much smaller than a backdrop blur radius. Scale it into a 10–20px band:
  // enough frost to read as glass, cheap enough to keep several on one page.
  // Blur cost grows with the radius, not the element size, so the small pills
  // stay inexpensive too.
  const radius = Math.min(20, Math.max(10, 6 + Number(blur || 0) * 1.2));

  const containerStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    '--glass-blur': `${radius}px`,
    '--glass-frost': backgroundOpacity,
    '--glass-saturation': saturation,
    ...style,
  };

  return (
    <div className={`glass-surface ${className}`} style={containerStyle}>
      <span className="glass-surface__sheen" aria-hidden="true" />
      <span className="glass-surface__rim" aria-hidden="true" />
      <div className="glass-surface__content">{children}</div>
    </div>
  );
};

export default GlassSurface;
