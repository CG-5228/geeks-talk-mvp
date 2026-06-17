import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGate';
import { logAdminAction } from '@/lib/adminAudit';
import {
  MODERATION_STATUSES,
  type ModerationStatus,
  fetchChannelMessages,
} from '@/lib/channelAdminServer';

export const dynamic = 'force-dynamic';

const VALID_MODERATION = new Set<'all' | ModerationStatus>(['all', ...MODERATION_STATUSES]);
const VALID_PINNED = new Set(['all', 'pinned', 'unpinned']);

export async function GET(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const channel = await db.room.findUnique({
    where: { id: params.channelId },
    select: { id: true, name: true, slug: true },
  });
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const moderationRaw = searchParams.get('moderation') || 'all';
  const pinnedRaw = searchParams.get('pinned') || 'all';
  const authorId = searchParams.get('authorId') || undefined;
  const since = searchParams.get('since') || undefined;
  const before = searchParams.get('before') || undefined;
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));

  try {
    const { rows, nextCursor, hasMore } = await fetchChannelMessages({
      channelId: params.channelId,
      q,
      moderation: VALID_MODERATION.has(moderationRaw as 'all' | ModerationStatus)
        ? (moderationRaw as 'all' | ModerationStatus)
        : 'all',
      pinned: (VALID_PINNED.has(pinnedRaw) ? pinnedRaw : 'all') as 'all' | 'pinned' | 'unpinned',
      authorId,
      since,
      before,
      limit,
    });

    return NextResponse.json({
      channel,
      messages: rows,
      pagination: { limit, nextCursor, hasMore },
    });
  } catch (error) {
    console.error('Channel messages fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

interface DeleteBody {
  messageIds?: unknown;
}

export async function DELETE(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: DeleteBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawIds = Array.isArray(body.messageIds) ? body.messageIds : [];
  const messageIds = Array.from(
    new Set(rawIds.filter((v): v is string => typeof v === 'string' && v.length > 0)),
  );
  if (messageIds.length === 0) {
    return NextResponse.json({ error: 'messageIds must be a non-empty array' }, { status: 400 });
  }
  if (messageIds.length > 200) {
    return NextResponse.json({ error: 'At most 200 messages per request' }, { status: 400 });
  }

  // Safety: only delete messages that belong to this channel.
  const toDelete = await db.message.findMany({
    where: { id: { in: messageIds }, roomId: params.channelId },
    select: { id: true },
  });
  const scoped = toDelete.map((m) => m.id);
  if (scoped.length === 0) {
    return NextResponse.json({ error: 'No matching messages in this channel' }, { status: 404 });
  }

  const result = await db.message.deleteMany({ where: { id: { in: scoped } } });

  await logAdminAction({
    adminId: gate.userId,
    action: 'channel.message_delete',
    targetType: 'channel',
    targetId: params.channelId,
    summary: `Deleted ${result.count} message${result.count === 1 ? '' : 's'}`,
    metadata: { requested: messageIds.length, deleted: result.count, ids: scoped },
    req,
  });

  return NextResponse.json({ deleted: result.count });
}
