import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGate';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Neutralize spreadsheet formula injection (leading =, +, -, @, tab, CR).
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  const selectedIds = idsParam
    ? idsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  const users = await db.user.findMany({
    where: selectedIds && selectedIds.length > 0 ? { id: { in: selectedIds } } : undefined,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      onlineStatus: true,
      lastSeen: true,
      createdAt: true,
      likesCount: true,
      activity: {
        select: { totalMessages: true, voiceMinutes: true, totalOnlineTime: true },
      },
      bans: {
        where: { expiresAt: { gt: new Date() } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const header = [
    'id',
    'name',
    'username',
    'email',
    'status',
    'last_seen',
    'joined',
    'likes',
    'total_messages',
    'voice_minutes',
    'total_online_minutes',
    'active_bans',
  ];

  const lines = [header.join(',')];
  for (const u of users) {
    lines.push(
      [
        csvEscape(u.id),
        csvEscape(u.name ?? ''),
        csvEscape(u.username ?? ''),
        csvEscape(u.email),
        csvEscape(u.onlineStatus),
        csvEscape(u.lastSeen ? u.lastSeen.toISOString() : ''),
        csvEscape(u.createdAt.toISOString()),
        csvEscape(u.likesCount),
        csvEscape(u.activity?.totalMessages ?? 0),
        csvEscape(u.activity?.voiceMinutes ?? 0),
        csvEscape(u.activity?.totalOnlineTime ?? 0),
        csvEscape(u.bans.length),
      ].join(','),
    );
  }

  const body = lines.join('\n');
  const filename = `users-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
