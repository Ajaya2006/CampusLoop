import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Glass dropdown anchored to a trigger.
 *
 * It renders into document.body on purpose: a `backdrop-filter` ancestor (the
 * glass capsule the trigger sits in) becomes a backdrop root, which stops a
 * nested backdrop blur from seeing the page behind it. Portalling keeps the
 * menu anchored to the trigger while blurring the actual page content.
 */
export default function GlassPopover({
  open,
  anchorRef,
  onClose,
  align = 'end',
  offset = 10,
  matchWidth = false,
  role = 'menu',
  className = '',
  children,
}) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return undefined;
    }

    const place = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const rect = anchor.getBoundingClientRect();
      // A select panel mirrors its trigger width, so it is measured after the
      // width is applied to keep the height (and the flip decision) honest.
      // offsetWidth is used because a rect shrinks while an ancestor's enter
      // animation is still scaling, which would leave the panel too narrow.
      if (matchWidth) panel.style.width = `${anchor.offsetWidth || rect.width}px`;

      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const margin = 12;

      let left = align === 'end' ? rect.right - width : rect.left;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

      let top = rect.bottom + offset;
      if (top + height > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - offset - height);
      }

      setPos({ top, left });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef, align, offset, matchWidth]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (anchorRef.current?.contains(event.target)) return;
      onClose?.();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      className={`pop-in liquid-glass liquid-glass-dropdown fixed z-[60] p-1.5 ${className}`}
      style={{
        top: pos ? pos.top : 0,
        left: pos ? pos.left : 0,
        transformOrigin: align === 'end' ? 'top right' : 'top left',
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
