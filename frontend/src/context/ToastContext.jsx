import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cx } from '../utils/format';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const TONES = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-brand-300/40 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [leaving, setLeaving] = useState([]);
  const timers = useRef({});

  const clearTimer = useCallback((key) => {
    if (!timers.current[key]) return;
    clearTimeout(timers.current[key]);
    delete timers.current[key];
  }, []);

  const remove = useCallback(
    (id) => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      setLeaving((current) => current.filter((currentId) => currentId !== id));
      clearTimer(id);
      clearTimer(`exit-${id}`);
    },
    [clearTimer],
  );

  const dismiss = useCallback(
    (id) => {
      clearTimer(id);
      setLeaving((current) => (current.includes(id) ? current : [...current, id]));
      clearTimer(`exit-${id}`);
      timers.current[`exit-${id}`] = setTimeout(() => remove(id), 220);
    },
    [clearTimer, remove],
  );

  const push = useCallback(
    (toast) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const entry = typeof toast === 'string' ? { type: 'info', title: toast } : { type: 'info', ...toast };
      setToasts((current) => [...current.slice(-3), { ...entry, id }]);
      timers.current[id] = setTimeout(() => dismiss(id), entry.duration || 4200);
      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      Object.values(timers.current).forEach((timer) => clearTimeout(timer));
    },
    [],
  );

  const value = useMemo(
    () => ({
      push,
      success: (title, message) => push({ type: 'success', title, message }),
      error: (title, message) => push({ type: 'error', title, message }),
      info: (title, message) => push({ type: 'info', title, message }),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          return (
            <div
              key={toast.id}
              data-leaving={leaving.includes(toast.id)}
              className={cx(
                'toast-item pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-control border bg-surface/90 p-3.5 shadow-lift',
                TONES[toast.type],
              )}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1 text-ink">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message ? <p className="mt-0.5 text-[13px] text-muted">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 text-muted transition hover:bg-elevated hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
