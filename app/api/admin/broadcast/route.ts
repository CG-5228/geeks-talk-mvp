import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAdminAction } from '@/lib/adminAudit';
import { requireAdmin, requireSuperAdmin } from '@/lib/adminGate';

export const dynamic = 'force-dynamic';

type Audience = 'all' | 'online' | 'active-7d' | 'admins';

const ALLOWED_AUDIENCES: readonly Audience[] = ['all', 'online', 'active-7d', 'admins'] as const;

function isAudience(v: unknown): v is Audience {
  return typeof v === 'string' && (ALLOWED_AUDIENCES as readonly string[]).includes(v);
}

async function resolveRecipientIds(audience: Audience): Promise<string[]> {
  if (audience === 'all') {
    const users = await db.user.findMany({ select: { id: true } });
    return users.map((u) => u.id);
  }
  if (audience === 'online') {
    const users = await db.user.findMany({
      where: { onlineStatus: 'online' },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
  if (audience === 'active-7d') {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const users = await db.user.findMany({
      where: { lastSeen: { gte: since } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
  // admins
  const admins = await db.adminPermission.findMany({ select: { userId: true } });
  return admins.map((a) => a.userId);
}

// GET — preview audience size, or return recent broadcast history
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') ?? 'history';

  if (mode === 'preview') {
    const audience = searchParams.get('audience');
    if (!isAudience(audience)) {
      return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
    }
    const ids = await resolveRecipientIds(audience);
    return NextResponse.json({ audience, count: ids.length });
  }

  const recent = await db.adminAuditLog.findMany({
    where: { action: 'notification.send' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      admin: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({ items: recent });
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { title, message, audience, type } = body as {
    title?: unknown;
    message?: unknown;
    audience?: unknown;
    type?: unknown;
  };

  if (typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
    return NextResponse.json({ error: 'Title required (≤200 chars)' }, { status: 400 });
  }
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) {
    return NextResponse.json({ error: 'Message required (≤2000 chars)' }, { status: 400 });
  }
  if (!isAudience(audience)) {
    return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
  }
  const notifType =
    typeof type === 'string' && type.trim().length > 0 && type.length <= 40
      ? type.trim()
      : 'announcement';

  const recipientIds = await resolveRecipientIds(audience);

  if (recipientIds.length === 0) {
    return NextResponse.json({ sent: 0, audience, reason: 'No recipients matched' });
  }

  // Batch inserts to avoid huge single payloads on very large user counts.
  const BATCH_SIZE = 500;
  let sent = 0;
  for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
    const slice = recipientIds.slice(i, i + BATCH_SIZE);
    const result = await db.notification.createMany({
      data: slice.map((userId) => ({
        userId,
        type: notifType,
        title: title.trim(),
        message: message.trim(),
        metadata: { broadcast: true, audience, sentBy: gate.userId } as any,
      })),
      skipDuplicates: false,
    });
    sent += result.count;
  }

  await logAdminAction({
    adminId: gate.userId,
    action: 'notification.send',
    targetType: 'broadcast',
    summary: `Sent "${title.trim().slice(0, 80)}" to ${sent} user(s) (${audience})`,
    metadata: {
      audience,
      recipients: sent,
      type: notifType,
    },
    req,
  });

  return NextResponse.json({ sent, audience, type: notifType });
}
