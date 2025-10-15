type ChannelId = string;

// In-memory fallback if Redis/socket not ready
const memPresence = new Map<ChannelId, Set<string>>();

export async function presenceJoin(channelId: string, userId: string) {
  const set = memPresence.get(channelId) ?? new Set<string>();
  set.add(userId);
  memPresence.set(channelId, set);
  return set.size;
}

export async function presenceLeave(channelId: string, userId: string) {
  const set = memPresence.get(channelId) ?? new Set<string>();
  set.delete(userId);
  memPresence.set(channelId, set);
  return set.size;
}

export async function presenceCount(channelId: string) {
  return memPresence.get(channelId)?.size ?? 0;
}

export async function presenceCounts(channelIds: string[]) {
  const result: Record<string, number> = {};
  for (const id of channelIds) result[id] = await presenceCount(id);
  return result;
}

// Global user presence tracking
const globalPresence = new Map<string, { status: 'online' | 'offline' | 'away'; lastSeen: Date }>();

export async function updateUserPresence(userId: string, status: 'online' | 'offline' | 'away') {
  globalPresence.set(userId, { status, lastSeen: new Date() });
  return status;
}

export async function getUserPresence(userId: string) {
  return globalPresence.get(userId) || { status: 'offline' as const, lastSeen: new Date() };
}

export async function getAllUserPresence() {
  return Object.fromEntries(globalPresence.entries());
}
