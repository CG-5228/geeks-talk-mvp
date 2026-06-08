import { db } from '@/lib/db';
import type { ReactionSummary } from '@/types/live';

export async function aggregateReactionsByMessage(
  messageIds: string[],
  messageType: 'channel' | 'dm'
): Promise<Record<string, ReactionSummary[]>> {
  if (messageIds.length === 0) return {};
  const rows = await db.messageReaction.findMany({
    where: { messageType, messageId: { in: messageIds } },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const byMessage: Record<string, Map<string, ReactionSummary>> = {};
  for (const r of rows) {
    const bucket = (byMessage[r.messageId] ??= new Map());
    const existing = bucket.get(r.emoji);
    if (existing) {
      existing.count += 1;
      existing.users.push({ id: r.user.id, name: r.user.name ?? 'User', image: r.user.image });
    } else {
      bucket.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        users: [{ id: r.user.id, name: r.user.name ?? 'User', image: r.user.image }],
      });
    }
  }

  const out: Record<string, ReactionSummary[]> = {};
  for (const [id, map] of Object.entries(byMessage)) out[id] = Array.from(map.values());
  return out;
}
