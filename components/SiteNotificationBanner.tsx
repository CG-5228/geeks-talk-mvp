'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type Behavior = 'TIMED' | 'PERSISTENT';

interface BannerProps {
  id: string;
  scope: 'main' | 'live';
  message: string;
  variant: 'warning' | 'info' | 'danger' | 'success' | string;
  behavior: Behavior;
  durationMs?: number | null;
  dismissKey: string;
}

function getClasses(variant: BannerProps['variant']) {
  switch (variant) {
    case 'danger':
      return 'bg-red-500/20 border-red-500/60 text-red-100 backdrop-blur-sm';
    case 'success':
      return 'bg-emerald-500/20 border-emerald-500/60 text-emerald-100 backdrop-blur-sm';
    case 'info':
      return 'bg-sky-500/20 border-sky-500/60 text-sky-100 backdrop-blur-sm';
    case 'warning':
    default:
      return 'bg-amber-500/20 border-amber-500/60 text-amber-50 backdrop-blur-sm';
  }
}

export default function SiteNotificationBanner(props: BannerProps) {
  const { id, scope, message, variant, behavior, durationMs, dismissKey } = props;
  const [visible, setVisible] = useState(true);
  const [lastDismissKey, setLastDismissKey] = useState(dismissKey);

  useEffect(() => {
    // If dismissKey changed, reset visibility (new banner)
    if (dismissKey !== lastDismissKey) {
      console.log(`[Banner] DismissKey changed from ${lastDismissKey} to ${dismissKey}, resetting visibility`);
      setLastDismissKey(dismissKey);
      setVisible(true);
    }

    // Check localStorage for guest dismissal
    const key = `siteAnnouncement:${dismissKey}`;
    if (typeof window !== 'undefined') {
      const dismissed = window.localStorage.getItem(key);
      console.log(`[Banner] Checking localStorage dismissal for key "${key}":`, {
        dismissed: dismissed === '1',
        dismissKey,
        bannerId: id,
        scope,
      });
      if (dismissed === '1') {
        console.log(`[Banner] Banner hidden due to localStorage dismissal: ${id}`);
        setVisible(false);
      } else {
        // If not dismissed, make sure banner is visible
        console.log(`[Banner] Banner not dismissed, showing: ${id}`);
        setVisible(true);
      }
    }
  }, [dismissKey, id, scope, lastDismissKey]);

  useEffect(() => {
    if (!visible) return;
    if (behavior !== 'TIMED') return;

    const timeout = setTimeout(() => {
      handleClose(false);
    }, durationMs ?? 5000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, behavior, durationMs]);

  const handleClose = async (persist: boolean = true) => {
    setVisible(false);

    if (persist && typeof window !== 'undefined') {
      // Guest persistence via localStorage
      const key = `siteAnnouncement:${dismissKey}`;
      window.localStorage.setItem(key, '1');
    }

    // Record dismissal in DB for logged-in users
    if (persist) {
      try {
        await fetch('/api/user/announcement-dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcementId: id }),
        });
      } catch (e) {
        // Ignore errors
      }
    }
  };

  // #region agent log
  console.log(`[Banner] Rendering banner ${id} for scope ${scope}:`, {
    visible,
    message: message.substring(0, 50),
    variant,
  });
  // #endregion

  if (!visible) return null;

  const classes = getClasses(variant);

  return (
    <div 
      className={`w-full border-b ${classes} relative z-40 shadow-lg`}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 text-sm">
        <div className="flex-1 min-w-0">
          <p className="truncate sm:whitespace-normal font-medium">{message}</p>
        </div>
        <button
          type="button"
          aria-label="Close notification"
          onClick={() => handleClose(true)}
          className="ml-2 p-1.5 rounded hover:bg-white/20 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
