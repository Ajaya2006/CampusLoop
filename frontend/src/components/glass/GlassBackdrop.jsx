import GlassSurface from './GlassSurface';

/**
 * Liquid glass that fills its parent element.
 *
 * The bar, capsule or cluster stays the positioned, sized box; this layer only
 * supplies the material (refraction, tint, lit rim) behind the content, so the
 * glass can never affect layout or catch pointer events.
 */
export default function GlassBackdrop({
  radius = 999,
  borderWidth = 0.06,
  brightness = 50,
  opacity = 0.93,
  blur = 8,
  displace = 0.4,
  backgroundOpacity = 0.1,
  saturation = 1,
  distortionScale = -180,
  ...props
}) {
  return (
    <GlassSurface
      width="100%"
      height="100%"
      borderRadius={radius}
      borderWidth={borderWidth}
      brightness={brightness}
      opacity={opacity}
      blur={blur}
      displace={displace}
      backgroundOpacity={backgroundOpacity}
      saturation={saturation}
      distortionScale={distortionScale}
      refraction
      renderer="auto"
      className="glass-backdrop"
      {...props}
    />
  );
}
