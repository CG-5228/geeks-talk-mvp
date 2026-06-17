import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { createEmailCode } from '@/lib/emailCode';
import { sendEmailWithFallback, renderCodeEmail } from '@/lib/emailResend';
import { rateLimit } from '@/lib/rateLimit';

const Schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local';
  const rl = await rateLimit(`email-change:${session.user.id}:${ip}`, 3, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const newEmail = parsed.data.email;

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (me.email.toLowerCase() === newEmail) {
    return NextResponse.json({ error: 'That is already your email' }, { status: 400 });
  }

  const taken = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (taken) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });

  const { code } = await createEmailCode(newEmail, 'change', session.user.id);
  const ok = await sendEmailWithFallback({
    subject: 'Confirm your new Geeks Talk email',
    html: renderCodeEmail(code),
    to: newEmail,
  });
  if (!ok) {
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, ttlMinutes: 10 });
}
