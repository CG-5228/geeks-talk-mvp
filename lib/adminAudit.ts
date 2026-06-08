import type { NextRequest } from 'next/server';
import { db } from './db';

export type AdminAuditAction =
  | 'user.ban'
  | 'user.unban'
  | 'user.bulk_ban'
  | 'user.bulk_unban'
  | 'user.bulk_message'
  | 'user.message'
  | 'report.resolve'
  | 'report.reject'
  | 'report.bulk_update'
  | 'banner.save'
  | 'banner.toggle'
  | 'banner.delete'
  | 'admin.grant'
  | 'admin.revoke'
  | 'admin.update'
  | 'blog.delete'
  | 'blog.publish'
  | 'tutorial.delete'
  | 'contact.reply'
  | 'bug.resolve'
  | 'notification.send'
  | 'flag.create'
  | 'flag.update'
  | 'flag.toggle'
  | 'flag.delete'
  | 'channel.archive'
  | 'channel.unarchive'
  | 'channel.bulk_delete'
  | 'channel.delete'
  | 'voicegroup.kick_all'
  | 'voicegroup.delete';

interface LogArgs {
  adminId: string;
  action: AdminAuditAction | string;
  targetType?: string;
  targetId?: string;
  summary?: string;
  metadata?: Record<string, unknown> | null;
  req?: Request | NextRequest;
}

function extractIp(req?: Request | NextRequest): string | undefined {
  if (!req) return undefined;
  const h = req.headers;
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return h.get('x-real-ip') || h.get('cf-connecting-ip') || undefined;
}

/**
 * Record an admin action. Safe to await — failures are swallowed
 * so audit infrastructure never blocks the primary action.
 */
export async function logAdminAction(args: LogArgs): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        adminId: args.adminId,
        action: args.action,
        targetType: args.targetType ?? null,
        targetId: args.targetId ?? null,
        summary: args.summary ?? null,
        metadata: (args.metadata ?? null) as any,
        ip: extractIp(args.req) ?? null,
        userAgent: args.req?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    console.error('[adminAudit] Failed to record action', args.action, err);
  }
}
