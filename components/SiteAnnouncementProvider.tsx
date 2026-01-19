'use client';

import { useEffect, useState, useRef } from 'react';
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const connectSSE = () => {
      if (cancelled) return;

      // Close existing connection if any
      if (sseRef.current) {
        sseRef.current.close();
      }

      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      try {
        const eventSource = new EventSource(`/api/announcements/realtime?scope=${scope}`);
        sseRef.current = eventSource;

        eventSource.onopen = () => {
          reconnectAttemptsRef.current = 0;
          // #region agent log
          console.log(`[Banner] SSE connection opened for scope: ${scope}`);
          fetch('http://127.0.0.1:7242/ingest/bb9359b2-0268-40e1-8961-bb0e3cf8ee2b', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'pre-fix',
              hypothesisId: 'H2',
              location: 'components/SiteAnnouncementProvider.tsx:onopen',
              message: 'SSE connection opened',
              data: { scope },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
        };

        eventSource.onmessage = (event) => {
          if (cancelled) return;
          try {
            const data = JSON.parse(event.data);

            // #region agent log
            console.log(`[Banner] SSE message received for scope ${scope}:`, {
              hasAnnouncement: !!data.announcement,
              id: data.announcement?.id ?? null,
              message: data.announcement?.message?.substring(0, 50) ?? null,
            });
            fetch('http://127.0.0.1:7242/ingest/bb9359b2-0268-40e1-8961-bb0e3cf8ee2b', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'pre-fix',
                hypothesisId: data.announcement ? 'H2' : 'H1',
                location: 'components/SiteAnnouncementProvider.tsx:onmessage',
                message: 'SSE message received',
                data: {
                  scope,
                  hasAnnouncement: !!data.announcement,
                  id: data.announcement?.id ?? null,
                },
                timestamp: Date.now(),
              }),
            }).catch(() => {});
            // #endregion

            if (data.announcement) {
              console.log(`[Banner] Setting announcement state for scope ${scope}:`, data.announcement.id);
              setAnnouncement(data.announcement);
            } else {
              console.log(`[Banner] Clearing announcement state for scope ${scope}`);
              setAnnouncement(null);
            }
          } catch (error) {
            console.error(`Error parsing SSE data for scope ${scope}:`, error);
          }
        };

        eventSource.onerror = () => {
          if (cancelled) return;

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bb9359b2-0268-40e1-8961-bb0e3cf8ee2b', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'pre-fix',
              hypothesisId: 'H2',
              location: 'components/SiteAnnouncementProvider.tsx:onerror',
              message: 'SSE connection error',
              data: { scope },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          
          // Close the connection
          eventSource.close();
          sseRef.current = null;

          // Exponential backoff for reconnection
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (!cancelled) {
              connectSSE();
            }
          }, delay);
        };
      } catch (error) {
        console.error(`Error setting up SSE for scope ${scope}:`, error);
        // Fallback to one-time fetch if SSE fails
        const load = async () => {
          try {
            const res = await fetch(`/api/announcements?scope=${scope}`, {
              cache: 'no-store',
            });
            if (!res.ok) {
              console.warn(`Failed to fetch announcement for scope ${scope}:`, res.status, res.statusText);
              return;
            }
            const data = await res.json();
            if (!cancelled) {
              setAnnouncement(data.announcement ?? null);
            }
          } catch (e) {
            console.error(`Error fetching announcement for scope ${scope}:`, e);
          }
        };
        load();
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

