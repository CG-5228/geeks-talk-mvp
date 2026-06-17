import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyEmailCode } from '@/lib/emailCode';
import { rateLimit } from '@/lib/rateLimit';

const Schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{4,8}$/),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local';
  const rl = await rateLimit(`email-verify:${session.user.id}:${ip}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { email, code } = parsed.data;

  const taken = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (taken && taken.id !== session.user.id) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  const result = await verifyEmailCode(email, code, 'change');
  if (!result.valid) {
    return NextResponse.json({ error: result.error || 'Invalid code' }, { status: 400 });
  }
  if (result.userId && result.userId !== session.user.id) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { email, emailVerified: new Date() },
  });

  return NextResponse.json({ ok: true, email });
}
