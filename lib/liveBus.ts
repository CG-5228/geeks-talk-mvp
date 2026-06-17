// In-process pub/sub for live chat events. Subscribers pass an array of room
// names and receive every event published to any of those rooms via the
// callback. Works out of the box in single-instance dev; a production deployment
// across multiple replicas would need to swap this for Redis Pub/Sub (or similar)
// without changing the exported surface.

import { EventEmitter } from 'events';

export type LiveEvent = {
  room: string;
  event: string;
  payload: unknown;
  // Monotonic-ish id per bus instance for client dedup / replay.
  id: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __gt_live_bus__: { emitter: EventEmitter; counter: number } | undefined;
}

function getBus() {
  if (!globalThis.__gt_live_bus__) {
    const emitter = new EventEmitter();
    // No hard cap — typical channel has dozens of live listeners plus the
    // dashboard's own subscription, which would otherwise trip the default 10.
    emitter.setMaxListeners(0);
    globalThis.__gt_live_bus__ = { emitter, counter: 0 };
  }
  return globalThis.__gt_live_bus__;
}

const EVENT = 'live';

export function publish(room: string, event: string, payload: unknown): void {
  const bus = getBus();
  bus.counter += 1;
  const ev: LiveEvent = { room, event, payload, id: bus.counter };
  bus.emitter.emit(EVENT, ev);
}

export function publishMany(rooms: string[], event: string, payload: unknown): void {
  for (const r of rooms) publish(r, event, payload);
}

export function subscribe(rooms: string[], handler: (ev: LiveEvent) => void): () => void {
  const bus = getBus();
  const set = new Set(rooms);
  const listener = (ev: LiveEvent) => {
    if (set.has(ev.room)) handler(ev);
  };
  bus.emitter.on(EVENT, listener);
  return () => {
    bus.emitter.off(EVENT, listener);
  };
}
