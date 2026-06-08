import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGate';
import { logAdminAction } from '@/lib/adminAudit';

const MAX_IDS = 100;

type Body = {
  channelIds?: unknown;
  action?: unknown;
};

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as Body | null;
  const rawIds = Array.isArray(body?.channelIds) ? body!.channelIds : [];
  const channelIds = Array.from(
    new Set(rawIds.filter((v): v is string => typeof v === 'string' && v.length > 0)),
  );
  const action = typeof body?.action === 'string' ? body!.action : '';

  if (channelIds.length === 0) {
    return NextResponse.json({ error: 'channelIds must be a non-empty array' }, { status: 400 });
  }
  if (channelIds.length > MAX_IDS) {
    return NextResponse.json({ error: `At most ${MAX_IDS} channels per request` }, { status: 400 });
  }

  if (action === 'archive' || action === 'unarchive') {
    const archived = action === 'archive';
    const result = await db.room.updateMany({
      where: { id: { in: channelIds } },
      data: { archived },
    });

    await logAdminAction({
      adminId: gate.userId,
      action: archived ? 'channel.archive' : 'channel.unarchive',
      targetType: 'channel',
      summary: `${result.count} channels ${archived ? 'archived' : 'unarchived'}`,
      metadata: { requested: channelIds.length, updated: result.count, bulk: true },
      req,
    });

    return NextResponse.json({ updated: result.count, action });
  }

  if (action === 'delete') {
    // Delete messages first (no cascade on this relation)
    await db.message.deleteMany({ where: { roomId: { in: channelIds } } });
    const result = await db.room.deleteMany({ where: { id: { in: channelIds } } });

    await logAdminAction({
      adminId: gate.userId,
      action: 'channel.bulk_delete',
      targetType: 'channel',
      summary: `${result.count} channels deleted`,
      metadata: { requested: channelIds.length, deleted: result.count },
      req,
    });

    return NextResponse.json({ deleted: result.count, action });
  }

  return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
}
