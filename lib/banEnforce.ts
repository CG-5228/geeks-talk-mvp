import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export type ActiveBan = {
  id: string;
  reason: string;
  expiresAt: Date;
};

export async function getActiveBan(userId: string): Promise<ActiveBan | null> {
  const ban = await db.userBan.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' },
    select: { id: true, reason: true, expiresAt: true },
  });
  return ban;
}

export type BanGateResult = { ok: true } | { ok: false; response: NextResponse };

export async function requireNotBanned(userId: string): Promise<BanGateResult> {
  const ban = await getActiveBan(userId);
  if (!ban) return { ok: true };
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'Account suspended',
        banned: true,
        reason: ban.reason,
        expiresAt: ban.expiresAt.toISOString(),
      },
      { status: 403 },
    ),
  };
}
