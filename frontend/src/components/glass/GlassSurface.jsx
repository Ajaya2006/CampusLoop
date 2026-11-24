import './GlassSurface.css';

/**
 * CampusLoop liquid glass.
 *
 * A semi-transparent pane with a frosted blur, a lit rim, a soft specular
 * highlight, layered shadows and a gradient tint. Everything here is plain CSS,
 * so the browser composites it like any other backdrop-filter.
 *
 * `effect` mirrors the `effect` prop of Apple's `UIGlassEffect` the way
 * `@callstack/liquid-glass` exposes it to React Native. That package is an
 * iOS-native module (it needs `react-native` and only ships `.ios.js` views), so
 * it cannot be installed in this Vite app; this prop is the portable
 * equivalent. Everything else the native view takes (`tintColor`,
 * `colorScheme`, `interactive`) has no call site here, so it is not modelled.
 *
 * The previous version bent the backdrop with an SVG `feDisplacementMap` chain
 * (and a WebGL fallback). That reads as real refraction, but it forces a
 * full-frame filter on every glass element, on every scroll and every hover —
 * which is what made the app feel laggy. The refraction-only props below are
 * still accepted so existing call sites keep working; they are simply unused.
 */

/** `regular` (blurred), `clear` (more transparent) or `none` (no material). */
const EFFECTS = new Set(['regular', 'clear', 'none']);

const GlassSurface = ({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  backgroundOpacity = 0.1,
  saturation = 1.4,
  blur = 8,
  effect = 'regular',
  className = '',
  style = {},
  // Accepted for API compatibility, not used by the CSS material.
  borderWidth: _borderWidth,
  brightness: _brightness,
  opacity: _opacity,
  displace: _displace,
  distortionScale: _distortionScale,
  redOffset: _redOffset,
  greenOffset: _greenOffset,
  blueOffset: _blueOffset,
  xChannel: _xChannel,
  yChannel: _yChannel,
  mixBlendMode: _mixBlendMode,
  refraction: _refraction,
  renderer: _renderer,
  backdrop: _backdrop,
  shape: _shape,
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
    <div
      className={`glass-surface ${className}`}
      // `clear` thins the frost and softens the rim; `none` removes the
      // material while keeping the box (the reference's transparent view).
      data-glass-effect={EFFECTS.has(effect) ? effect : 'regular'}
      style={containerStyle}
    >
      <span className="glass-surface__sheen" aria-hidden="true" />
      <span className="glass-surface__rim" aria-hidden="true" />
      <div className="glass-surface__content">{children}</div>
    </div>
  );
};

export default GlassSurface;
