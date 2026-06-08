"use client";
import { useEffect, useRef } from 'react';

export type LiveEventHandler = (event: string, payload: any, room: string) => void;

export interface UseLiveStreamOptions {
  rooms: string[];
  onEvent: LiveEventHandler;
  enabled?: boolean;
}

// Opens a single EventSource per rooms-list and dispatches every named event
// to the supplied handler. Re-subscribes whenever the rooms list changes.
// Uses a ref for the handler so callers can pass inline closures without
// triggering reconnects on every render.
export function useLiveStream({ rooms, onEvent, enabled = true }: UseLiveStreamOptions) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  const roomsKey = rooms.slice().sort().join(',');

  useEffect(() => {
    if (!enabled) return;
    if (!roomsKey) return;
    if (typeof window === 'undefined') return;

    const url = `/api/live/stream?rooms=${encodeURIComponent(roomsKey)}`;
    const es = new EventSource(url, { withCredentials: true });

    // Known server-side event names. Listening individually lets the browser
    // route each by `event:` field; an 'unknown' handler catches the rest.
    const eventNames = [
      'ready',
      'message:new',
      'message:deleted',
      'message:updated',
      'message:pinned',
      'message:unpinned',
      'reaction:updated',
      'dm:new',
      'dm:deleted',
      'dm:updated',
      'typing:start',
      'typing:stop',
      'presence:update',
    ];

    const listeners: Array<[string, EventListener]> = [];
    for (const name of eventNames) {
      const listener: EventListener = (e) => {
        const me = e as MessageEvent<string>;
        try {
          const data = JSON.parse(me.data) as { room: string; payload: unknown };
          handlerRef.current(name, data.payload, data.room);
        } catch (err) {
          console.warn('Invalid SSE frame', err);
        }
      };
      es.addEventListener(name, listener);
      listeners.push([name, listener]);
    }

    es.onerror = () => {
      // EventSource auto-reconnects on error; nothing to do beyond logging.
    };

    return () => {
      for (const [name, l] of listeners) es.removeEventListener(name, l);
      es.close();
    };
  }, [roomsKey, enabled]);
}
