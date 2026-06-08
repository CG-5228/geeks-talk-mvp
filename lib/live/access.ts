import { db } from '@/lib/db';

export type AccessibleRoom = {
  id: string;
  visibility: string;
  ownerId: string | null;
  users: { id: string }[];
};

/**
 * Single source of truth for channel read/write authorization. Mirrors the rule
 * already used by POST /api/live/messages: public channels are open to any
 * authenticated user; private channels require ownership or membership (the
 * RoomUsers relation). Centralized so every read/write/stream path enforces the
 * same check instead of re-implementing (or forgetting) it.
 */
export function canAccessRoom(room: AccessibleRoom, userId: string): boolean {
  if (room.visibility !== 'private') return true;
  return room.ownerId === userId || room.users.some((u) => u.id === userId);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUID_RE = /^c[a-z0-9]{24}$/i;

/**
 * Resolve a channel id or slug to a room carrying exactly the fields needed for
 * an access check, or null if it does not exist.
 */
export async function getAccessibleRoom(channel: string): Promise<AccessibleRoom | null> {
  const byId = UUID_RE.test(channel) || CUID_RE.test(channel);
  return db.room.findUnique({
    where: byId ? { id: channel } : { slug: channel },
    select: { id: true, visibility: true, ownerId: true, users: { select: { id: true } } },
  });
}
