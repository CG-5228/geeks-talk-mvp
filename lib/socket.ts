// Backwards-compatible facade: delegates the existing emitToRoom API surface
// to the new in-process bus in lib/liveBus.ts. Older call sites (typing,
// presence) keep working while the bus powers the SSE stream.

import { publish, publishMany } from '@/lib/liveBus';

// Kept for any legacy callers referencing the socket.io-style globals.
type IoLike = {
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
  emit: (event: string, payload: unknown) => void;
};

declare global {
  // eslint-disable-next-line no-var
  var __gt_io__: IoLike | undefined;
}

export function getIO(): IoLike | null {
  return globalThis.__gt_io__ ?? null;
}

export function setIO(io: IoLike) {
  globalThis.__gt_io__ = io;
}

export function emitToRoom(room: string, event: string, payload: unknown) {
  try {
    publish(room, event, payload);
  } catch {
    // swallow emit errors to keep API stable
  }
}

export function emitToRooms(rooms: string[], event: string, payload: unknown) {
  try {
    publishMany(rooms, event, payload);
  } catch {
    // swallow emit errors to keep API stable
  }
}

export function emitToAll(event: string, payload: unknown) {
  try {
    // Fan out to a synthetic global room; subscribers explicitly include 'all'
    // if they want these (currently unused but kept for API symmetry).
    publish('all', event, payload);
  } catch {
    // swallow emit errors to keep API stable
  }
}
