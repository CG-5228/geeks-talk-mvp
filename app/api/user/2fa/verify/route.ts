import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyTOTP, generateBackupCodes, hashBackupCode } from '@/lib/totp';
import { getPendingTotpSecret, clearPendingTotpSecret } from '@/lib/twoFactorPending';
import { awardBadge } from '@/lib/badges';
import { rateLimit } from '@/lib/rateLimit';

const Schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local';
  const rl = await rateLimit(`2fa-verify:${session.user.id}:${ip}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });
  // Prefer the pending secret from setup; fall back to a persisted one (no Redis).
  const secret = (await getPendingTotpSecret(session.user.id)) || me?.twoFactorSecret;
  if (!secret) {
    return NextResponse.json({ error: 'Run setup first' }, { status: 400 });
  }

  const valid = verifyTOTP(secret, parsed.data.code, { window: 1 });
  if (!valid) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  const backup = generateBackupCodes(10);
  const hashed = backup.map(hashBackupCode);

  await db.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      twoFactorBackupCodes: hashed,
    },
  });
  await clearPendingTotpSecret(session.user.id);

  await awardBadge(session.user.id, 'two-factor');

  return NextResponse.json({ ok: true, backupCodes: backup });
}
