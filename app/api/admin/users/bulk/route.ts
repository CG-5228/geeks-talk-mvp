import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGate';
import { db } from '@/lib/db';
import { logAdminAction } from '@/lib/adminAudit';

const MAX_IDS = 500;

type BulkBody = {
  userIds?: unknown;
  action?: unknown;
  reason?: unknown;
  duration?: unknown;
  subject?: unknown;
  message?: unknown;
  priority?: unknown;
};

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as BulkBody | null;
  const rawIds = Array.isArray(body?.userIds) ? body!.userIds : [];
  const userIds = Array.from(
    new Set(rawIds.filter((v): v is string => typeof v === 'string' && v.length > 0)),
  );
  const action = typeof body?.action === 'string' ? body!.action : '';

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'userIds must be a non-empty array of strings' }, { status: 400 });
  }
  if (userIds.length > MAX_IDS) {
    return NextResponse.json({ error: `At most ${MAX_IDS} users per request` }, { status: 400 });
  }

  // Filter out super-admin accounts for destructive actions
  const destructive = action === 'ban';
  let targetIds = userIds;
  let skippedSuperAdmins = 0;
  if (destructive && process.env.SUPER_ADMIN_EMAIL) {
    const superAdmins = await db.user.findMany({
      where: { id: { in: userIds }, email: process.env.SUPER_ADMIN_EMAIL },
      select: { id: true },
    });
    const superSet = new Set(superAdmins.map((u) => u.id));
    skippedSuperAdmins = superSet.size;
    targetIds = userIds.filter((id) => !superSet.has(id));
  }

  if (action === 'unban') {
    const now = new Date();
    const result = await db.userBan.updateMany({
      where: { userId: { in: userIds }, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });

    await logAdminAction({
      adminId: gate.userId,
      action: 'user.bulk_unban',
      targetType: 'user',
      summary: `${result.count} active bans expired across ${userIds.length} users`,
      metadata: { requested: userIds.length, updated: result.count, userIds: userIds.slice(0, 50) },
      req,
    });

    return NextResponse.json({ updated: result.count, action });
  }

  if (action === 'ban') {
    const reason = typeof body?.reason === 'string' ? body!.reason.trim() : '';
    const duration = typeof body?.duration === 'number' ? Math.max(1, Math.min(365, Math.floor(body!.duration))) : 0;
    if (!reason || reason.length < 3) {
      return NextResponse.json({ error: 'A reason (min 3 chars) is required' }, { status: 400 });
    }
    if (!duration) {
      return NextResponse.json({ error: 'Duration (1–365 days) is required' }, { status: 400 });
    }
    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No eligible users to ban (super admins excluded)' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    const banRows = await db.$transaction(
      targetIds.map((userId) =>
        db.userBan.create({
          data: { userId, bannedBy: gate.userId, reason, duration, expiresAt },
          select: { id: true, userId: true },
        }),
      ),
    );

    await db.notification.createMany({
      data: targetIds.map((userId) => ({
        userId,
        type: 'ban',
        title: 'Account Suspended',
        message: `Your account has been suspended for ${duration} day${duration > 1 ? 's' : ''}. Reason: ${reason}`,
      })),
    });

    await logAdminAction({
      adminId: gate.userId,
      action: 'user.bulk_ban',
      targetType: 'user',
      summary: `${banRows.length} users banned for ${duration}d — ${reason}`,
      metadata: {
        requested: userIds.length,
        banned: banRows.length,
        skippedSuperAdmins,
        duration,
        expiresAt: expiresAt.toISOString(),
      },
      req,
    });

    return NextResponse.json({ banned: banRows.length, skippedSuperAdmins, action });
  }

  if (action === 'message') {
    const subject = typeof body?.subject === 'string' ? body!.subject.trim() : '';
    const message = typeof body?.message === 'string' ? body!.message.trim() : '';
    const priority = typeof body?.priority === 'string' ? body!.priority : 'normal';
    if (!subject || subject.length < 2) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!message || message.length < 2) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }

    const adminMessages = await db.$transaction(
      userIds.map((userId) =>
        db.adminMessage.create({
          data: { recipientId: userId, senderId: gate.userId, subject, message },
          select: { id: true, recipientId: true },
        }),
      ),
    );

    const notifyResult = await db.notification.createMany({
      data: adminMessages.map((m) => ({
        userId: m.recipientId,
        type: 'admin_message',
        title: subject,
        message,
        metadata: { messageId: m.id, senderId: gate.userId, priority, bulk: true },
      })),
    });

    await logAdminAction({
      adminId: gate.userId,
      action: 'user.bulk_message',
      targetType: 'user',
      summary: `Sent "${subject}" to ${adminMessages.length} users`,
      metadata: {
        requested: userIds.length,
        delivered: adminMessages.length,
        notifications: notifyResult.count,
        priority,
      },
      req,
    });

    return NextResponse.json({ delivered: adminMessages.length, action });
  }

  return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
}
