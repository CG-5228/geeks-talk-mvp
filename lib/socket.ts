// Minimal Socket.IO server facade and global singleton helpers.
// This lets API routes emit events without crashing when the server isn't initialized yet.

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
    const io = getIO();
    if (!io) return; // no-op if server not wired yet
    io.to(room).emit(event, payload);
  } catch {
    // swallow emit errors to keep API stable
  }
}

// Helper function to emit to multiple rooms
export function emitToRooms(rooms: string[], event: string, payload: unknown) {
  try {
    const io = getIO();
    if (!io) return;
    rooms.forEach(room => io.to(room).emit(event, payload));
  } catch {
    // swallow emit errors to keep API stable
  }
}

// Helper function to emit to all connected clients
export function emitToAll(event: string, payload: unknown) {
  try {
    const io = getIO();
    if (!io) return;
    io.emit(event, payload);
  } catch {
    // swallow emit errors to keep API stable
  }
}
