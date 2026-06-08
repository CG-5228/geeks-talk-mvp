'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Info, AlertTriangle, XCircle, CheckCircle2, Megaphone } from 'lucide-react';

type Behavior = 'TIMED' | 'PERSISTENT';
type Variant = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

interface BannerProps {
  id: string;
  scope: 'main' | 'live';
  message: string;
  variant: Variant | string;
  behavior: Behavior;
  durationMs?: number | null;
  dismissKey: string;
}

const VARIANT_STYLES: Record<Variant, { wrap: string; iconCls: string; progressCls: string; Icon: typeof Info }> = {
  info: {
    wrap: 'bg-sky-500/20 border-sky-500/60 text-sky-50',
    iconCls: 'text-sky-300',
    progressCls: 'bg-sky-300/70',
    Icon: Info,
  },
  warning: {
    wrap: 'bg-amber-500/20 border-amber-500/60 text-amber-50',
    iconCls: 'text-amber-200',
    progressCls: 'bg-amber-200/70',
    Icon: AlertTriangle,
  },
  danger: {
    wrap: 'bg-red-500/20 border-red-500/60 text-red-50',
    iconCls: 'text-red-200',
    progressCls: 'bg-red-200/70',
    Icon: XCircle,
  },
  success: {
    wrap: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-50',
    iconCls: 'text-emerald-200',
    progressCls: 'bg-emerald-200/70',
    Icon: CheckCircle2,
  },
  neutral: {
    wrap: 'bg-white/10 border-white/25 text-white',
    iconCls: 'text-white/80',
    progressCls: 'bg-white/60',
    Icon: Megaphone,
  },
};

const normalizeVariant = (v: string): Variant => {
  const known: Variant[] = ['info', 'warning', 'danger', 'success', 'neutral'];
  return known.includes(v as Variant) ? (v as Variant) : 'warning';
};

const splitMessage = (msg: string): { title: string; body: string } => {
  const [first, ...rest] = msg.split(/\n\s*\n/);
  if (rest.length === 0) return { title: '', body: first };
  return { title: first.trim(), body: rest.join('\n\n').trim() };
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function SiteNotificationBanner(props: BannerProps) {
  const { id, message, variant, behavior, durationMs, dismissKey } = props;
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(1);
  const lastKeyRef = useRef(dismissKey);

  const resolvedVariant = normalizeVariant(typeof variant === 'string' ? variant : 'warning');
  const { wrap, iconCls, progressCls, Icon } = VARIANT_STYLES[resolvedVariant];
  const { title, body } = splitMessage(message);

  // Reset visibility when dismissKey changes (admin republishes)
  useEffect(() => {
    if (dismissKey !== lastKeyRef.current) {
      lastKeyRef.current = dismissKey;
      setVisible(true);
    }
    if (typeof window === 'undefined') return;
    const storageKey = `siteAnnouncement:${dismissKey}`;
    setVisible(window.localStorage.getItem(storageKey) !== '1');
  }, [dismissKey]);

  // Entrance animation
  useEffect(() => {
    if (prefersReducedMotion()) {
      setMounted(true);
      return;
    }
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = useCallback(
    async (persist: boolean = true) => {
      setVisible(false);
      if (!persist) return;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`siteAnnouncement:${dismissKey}`, '1');
      }
      try {
        await fetch('/api/user/announcement-dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcementId: id }),
        });
      } catch {
        // Non-critical — localStorage gate above still hides it for this session.
      }
    },
    [dismissKey, id],
  );

  // Timed behavior + progress bar
  useEffect(() => {
    if (!visible || behavior !== 'TIMED') return;
    const total = Math.max(1000, durationMs ?? 5000);
    const startedAt = Date.now();
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const p = 1 - Math.min(1, elapsed / total);
      setProgress(p);
      if (p > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = setTimeout(() => handleClose(false), total);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [visible, behavior, durationMs, handleClose]);

  // Escape to dismiss
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, handleClose]);

  if (!visible) return null;

  return (
    <div
      className={[
        'relative z-40 w-full border-b shadow-lg backdrop-blur-sm',
        wrap,
        'transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
        mounted ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
      ].join(' ')}
      role={resolvedVariant === 'danger' ? 'alert' : 'status'}
      aria-live={resolvedVariant === 'danger' ? 'assertive' : 'polite'}
    >
      <div className="relative mx-auto flex max-w-6xl items-start justify-center gap-3 px-12 py-3 text-sm sm:px-14">
        <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconCls}`} aria-hidden />
        <div className="min-w-0 text-center">
          {title ? (
            <p className="leading-snug">
              <span className="font-semibold">{title}</span>
              {body && <span className="ml-2 opacity-90">{body}</span>}
            </p>
          ) : (
            <p className="font-medium leading-snug">{body}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Close notification"
          onClick={() => handleClose(true)}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md opacity-70 transition hover:bg-white/15 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {behavior === 'TIMED' && (
        <div className="h-0.5 w-full overflow-hidden bg-black/20">
          <div
            className={`h-full ${progressCls} motion-reduce:!w-full`}
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
