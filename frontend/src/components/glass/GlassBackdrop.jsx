import GlassSurface from './GlassSurface';

/**
 * Liquid glass that fills its parent element.
 *
 * The bar, capsule or cluster stays the positioned, sized box; this layer only
 * supplies the material (frost, tint, lit rim) behind the content, so the glass
 * can never affect layout or catch pointer events.
 */
export default function GlassBackdrop({
  radius = 999,
  blur = 8,
  backgroundOpacity = 0.1,
  saturation = 1,
  ...props
}) {
  return (
    <GlassSurface
      width="100%"
      height="100%"
      borderRadius={radius}
      blur={blur}
      backgroundOpacity={backgroundOpacity}
      saturation={saturation}
      className="glass-backdrop"
      {...props}
    />
  );
}
