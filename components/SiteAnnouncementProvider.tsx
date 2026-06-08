'use client';

import { useEffect, useRef, useState } from 'react';
import SiteNotificationBanner from './SiteNotificationBanner';

type Scope = 'main' | 'live';

interface ApiAnnouncement {
  id: string;
  scope: 'MAIN' | 'LIVE';
  message: string;
  variant: string;
  behavior: 'TIMED' | 'PERSISTENT';
  durationMs?: number | null;
  dismissKey: string;
}

interface Props {
  scope: Scope;
}

export default function SiteAnnouncementProvider({ scope }: Props) {
  const [announcement, setAnnouncement] = useState<ApiAnnouncement | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const connectSSE = () => {
      if (cancelled) return;

      if (sseRef.current) {
        sseRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      try {
        const eventSource = new EventSource(`/api/announcements/realtime?scope=${scope}`);
        sseRef.current = eventSource;

        eventSource.onopen = () => {
          reconnectAttemptsRef.current = 0;
        };

        eventSource.onmessage = (event) => {
          if (cancelled) return;
          try {
            const data = JSON.parse(event.data);
            setAnnouncement(data.announcement ?? null);
          } catch (error) {
            console.error(`Error parsing SSE data for scope ${scope}:`, error);
          }
        };

        eventSource.onerror = () => {
          if (cancelled) return;
          eventSource.close();
          sseRef.current = null;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!cancelled) connectSSE();
          }, delay);
        };
      } catch (error) {
        console.error(`Error setting up SSE for scope ${scope}:`, error);
        // Fallback to one-time fetch if SSE fails
        (async () => {
          try {
            const res = await fetch(`/api/announcements?scope=${scope}`, { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (!cancelled) setAnnouncement(data.announcement ?? null);
          } catch (e) {
            console.error(`Error fetching announcement for scope ${scope}:`, e);
          }
        })();
      }
    };

    connectSSE();

    return () => {
      cancelled = true;
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [scope]);

  if (!announcement) return null;

  return (
    <SiteNotificationBanner
      key={`${announcement.id}-${announcement.dismissKey}`}
      id={announcement.id}
      scope={scope}
      message={announcement.message}
      variant={(announcement.variant || 'warning') as any}
      behavior={announcement.behavior}
      durationMs={announcement.durationMs}
      dismissKey={announcement.dismissKey}
    />
  );
}
