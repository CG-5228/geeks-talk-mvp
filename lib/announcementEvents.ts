// Simple in-memory pub/sub for announcement updates.
// Note: This works for a single Next.js server instance. For multi-instance
// deployments, this should be replaced with a shared pub/sub (e.g. Redis).

export type AnnouncementScope = 'MAIN' | 'LIVE';

type Listener = (scope: AnnouncementScope) => void;

const listeners = new Set<Listener>();

export function addAnnouncementListener(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAnnouncementUpdate(scope: AnnouncementScope) {
  console.log(`[AnnouncementEvents] Emitting update for scope: ${scope}, listeners: ${listeners.size}`);
  for (const listener of listeners) {
    try {
      listener(scope);
    } catch (error) {
      // Listener errors should not break others
      console.error('Error in announcement listener:', error);
    }
  }
}

