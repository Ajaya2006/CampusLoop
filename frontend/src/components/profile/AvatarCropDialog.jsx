import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const VIEWPORT = 280;
const OUTPUT = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Square avatar cropper. The photo is dragged and zoomed inside a fixed
 * viewport, then drawn to a 512×512 canvas and returned as a JPEG File.
 */
export default function AvatarCropDialog({ open, file, onClose, onConfirm, busy = false }) {
  const [src, setSrc] = useState('');
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadError, setLoadError] = useState('');
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open || !file) return undefined;
    setImage(null);
    setLoadError('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const url = URL.createObjectURL(file);
    setSrc(url);
    const next = new Image();
    next.onload = () => setImage(next);
    next.onerror = () => setLoadError('This file could not be read as an image.');
    next.src = url;
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  if (!open || !file) return null;

  const coverScale = image
    ? Math.max(VIEWPORT / image.naturalWidth, VIEWPORT / image.naturalHeight)
    : 1;
  const drawWidth = image ? image.naturalWidth * coverScale * zoom : VIEWPORT;
  const drawHeight = image ? image.naturalHeight * coverScale * zoom : VIEWPORT;

  const clampOffset = (next, nextZoom = zoom) => {
    if (!image) return { x: 0, y: 0 };
    const width = image.naturalWidth * coverScale * nextZoom;
    const height = image.naturalHeight * coverScale * nextZoom;
    const maxX = Math.max(0, (width - VIEWPORT) / 2);
    const maxY = Math.max(0, (height - VIEWPORT) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  const changeZoom = (nextZoom) => {
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current, nextZoom));
  };

  const startDrag = (event) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const moveDrag = (event) => {
    const start = dragRef.current;
    if (!start) return;
    setOffset(
      clampOffset({
        x: start.offsetX + event.clientX - start.pointerX,
        y: start.offsetY + event.clientY - start.pointerY,
      }),
    );
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const save = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const context = canvas.getContext('2d');
    const ratio = OUTPUT / VIEWPORT;
    const left = (VIEWPORT - drawWidth) / 2 + offset.x;
    const top = (VIEWPORT - drawHeight) / 2 + offset.y;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, OUTPUT, OUTPUT);
    context.drawImage(
      image,
      left * ratio,
      top * ratio,
      drawWidth * ratio,
      drawHeight * ratio,
    );
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setLoadError('Could not prepare the photo. Try another image.');
          return;
        }
        onConfirm?.(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crop your photo"
      description="Drag to reposition, then zoom until your face sits inside the circle."
      size="sm"
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={save} loading={busy} disabled={!image || Boolean(loadError)} icon={ImageIcon}>
            Save photo
          </Button>
        </>
      )}
    >
      <div className="flex flex-col items-center">
        {loadError ? (
          <p className="py-10 text-center text-sm text-danger">{loadError}</p>
        ) : (
          <div
            role="img"
            aria-label="Avatar crop preview"
            className="relative isolate h-[280px] w-[280px] cursor-grab touch-none overflow-hidden rounded-full border border-line bg-canvas active:cursor-grabbing"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {image ? (
              <img
                src={src}
                alt=""
                draggable="false"
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: drawWidth,
                  height: drawHeight,
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                }}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">Loading photo…</span>
            )}
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/40" />
          </div>
        )}

        <div className="mt-5 flex w-full items-center gap-3">
          <ZoomOut size={16} className="shrink-0 text-muted" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-brand-500"
            aria-label="Photo zoom"
            disabled={!image}
          />
          <ZoomIn size={16} className="shrink-0 text-muted" />
        </div>
        <p className="mt-2 text-[11px] text-muted">Square crop · saved as a 512 px JPEG.</p>
      </div>
    </Modal>
  );
}
