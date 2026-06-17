'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
};

type ToastInput = Omit<Toast, 'id' | 'duration'> & { duration?: number };

type ToastContextValue = {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  confirm: (opts: {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'default';
  }) => Promise<boolean>;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { icon: React.ComponentType<{ className?: string }>; ring: string; iconCls: string }> = {
  success: { icon: CheckCircle2, ring: 'ring-emerald-500/30 bg-emerald-500/10', iconCls: 'text-emerald-400' },
  error: { icon: XCircle, ring: 'ring-red-500/30 bg-red-500/10', iconCls: 'text-red-400' },
  warning: { icon: AlertTriangle, ring: 'ring-amber-500/30 bg-amber-500/10', iconCls: 'text-amber-400' },
  info: { icon: Info, ring: 'ring-sky-500/30 bg-sky-500/10', iconCls: 'text-sky-400' },
};

type ConfirmState = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'danger' | 'default';
  resolve: (value: boolean) => void;
} | null;

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback<ToastContextValue['push']>(
    (toast) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = toast.duration ?? 4000;
      const next: Toast = { id, duration, ...toast };
      setToasts((prev) => [...prev, next]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  const confirm = useCallback<ToastContextValue['confirm']>((opts) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        title: opts.title,
        description: opts.description,
        confirmLabel: opts.confirmLabel ?? 'Confirm',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        tone: opts.tone ?? 'default',
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ push, dismiss, confirm }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => {
          const { icon: Icon, ring, iconCls } = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-white/10 bg-[#16181d]/95 p-3.5 shadow-xl ring-1 backdrop-blur-xl ${ring} animate-in fade-in slide-in-from-right-4 duration-200`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconCls}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">{toast.title}</div>
                {toast.description && (
                  <div className="mt-0.5 text-xs text-white/70">{toast.description}</div>
                )}
                {toast.actionLabel && toast.onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onAction?.();
                      dismiss(toast.id);
                    }}
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {confirmState && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            confirmState.resolve(false);
            setConfirmState(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-confirm-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16181d] p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  confirmState.tone === 'danger' ? 'bg-red-500/15 text-red-400' : 'bg-sky-500/15 text-sky-400'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 id="admin-confirm-title" className="text-base font-semibold text-white">
                  {confirmState.title}
                </h3>
                {confirmState.description && (
                  <p className="mt-1 text-sm text-white/70">{confirmState.description}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  confirmState.tone === 'danger'
                    ? 'border-red-500/30 bg-red-500/15 text-red-300 hover:bg-red-500/25'
                    : 'border-primary/30 bg-primary/15 text-primary hover:bg-primary/25'
                }`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useAdminToast must be used inside <AdminToastProvider>');
  }
  return ctx;
}
