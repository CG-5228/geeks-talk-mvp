import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGate';
import { logAdminAction } from '@/lib/adminAudit';
import { MODERATION_STATUSES, type ModerationStatus } from '@/lib/channelAdminServer';

export const dynamic = 'force-dynamic';

type PatchBody = {
  action?: unknown;
  moderationStatus?: unknown;
};

const VALID_ACTIONS = new Set(['pin', 'unpin', 'moderate']);

export async function PATCH(
  req: Request,
  props: { params: Promise<{ channelId: string; messageId: string }> },
) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: PatchBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : '';
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }

  const msg = await db.message.findFirst({
    where: { id: params.messageId, roomId: params.channelId },
    select: { id: true, pinnedAt: true, moderationStatus: true },
  });
  if (!msg) {
    return NextResponse.json({ error: 'Message not found in channel' }, { status: 404 });
  }

  if (action === 'pin') {
    await db.message.update({
      where: { id: msg.id },
      data: { pinnedAt: new Date(), pinnedBy: gate.userId },
    });
    await logAdminAction({
      adminId: gate.userId,
      action: 'channel.message_pin',
      targetType: 'channel',
      targetId: params.channelId,
      summary: 'Pinned message',
      metadata: { messageId: msg.id },
      req,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'unpin') {
    await db.message.update({
      where: { id: msg.id },
      data: { pinnedAt: null, pinnedBy: null },
    });
    await logAdminAction({
      adminId: gate.userId,
      action: 'channel.message_unpin',
      targetType: 'channel',
      targetId: params.channelId,
      summary: 'Unpinned message',
      metadata: { messageId: msg.id },
      req,
    });
    return NextResponse.json({ ok: true });
  }

  // moderate
  const next = typeof body.moderationStatus === 'string' ? body.moderationStatus : '';
  if (!(MODERATION_STATUSES as readonly string[]).includes(next)) {
    return NextResponse.json(
      { error: `Invalid moderationStatus: ${next}` },
      { status: 400 },
    );
  }
  await db.message.update({
    where: { id: msg.id },
    data: { moderationStatus: next as ModerationStatus },
  });
  await logAdminAction({
    adminId: gate.userId,
    action: 'channel.message_moderate',
    targetType: 'channel',
    targetId: params.channelId,
    summary: `Moderation: ${next}`,
    metadata: { messageId: msg.id, from: msg.moderationStatus, to: next },
    req,
  });
  return NextResponse.json({ ok: true, moderationStatus: next });
}
