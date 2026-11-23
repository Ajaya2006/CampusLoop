import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../utils/format';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape' && dismissible) onCloseRef.current?.();
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const timer = setTimeout(() => {
      panelRef.current?.querySelector('input, textarea, select, button')?.focus();
    }, 40);

    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [open, dismissible]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        data-no-ripple
        className="modal-backdrop absolute inset-0"
        onClick={() => dismissible && onCloseRef.current?.()}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={cx(
          'modal-panel relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-lift backdrop-blur-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-card sm:p-6',
          SIZES[size] || SIZES.md,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-lg font-semibold text-ink">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div
          className={cx(
            'modal-body cl-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain',
            title || description ? 'mt-4' : '',
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="mt-6 flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
