import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { verifyTOTP, hashBackupCode } from '@/lib/totp';
import { rateLimit } from '@/lib/rateLimit';

const Schema = z
  .object({
    password: z.string().optional(),
    code: z.string().trim().optional(),
  })
  .refine((d) => Boolean(d.password) || Boolean(d.code), {
    message: 'Password or 2FA code required',
  });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local';
  const rl = await rateLimit(`2fa-disable:${session.user.id}:${ip}`, 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      hashedPassword: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorBackupCodes: true,
    },
  });
  if (!me?.twoFactorEnabled) {
    return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
  }

  let authorized = false;
  if (parsed.data.password && me.hashedPassword) {
    authorized = await verifyPassword(parsed.data.password, me.hashedPassword);
  }
  if (!authorized && parsed.data.code && me.twoFactorSecret) {
    if (/^\d{6}$/.test(parsed.data.code)) {
      authorized = verifyTOTP(me.twoFactorSecret, parsed.data.code, { window: 1 });
    } else {
      const hashed = hashBackupCode(parsed.data.code);
      authorized = me.twoFactorBackupCodes.includes(hashed);
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    },
  });

  return NextResponse.json({ ok: true });
}
