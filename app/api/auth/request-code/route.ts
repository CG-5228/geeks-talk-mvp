import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { createOrReplaceEmailCode, isAllowedEmailDomain } from '@/lib/verification';
import { sendEmailResend, renderCodeEmail } from '@/lib/emailResend';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: string; purpose?: 'signup'|'reset'|'change' };
  const email = (body?.email || '').trim().toLowerCase();
  const purpose = body?.purpose || 'signup';
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  if (!isAllowedEmailDomain(email)) {
    return NextResponse.json({ error: 'Email provider not supported' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for') || 'local';
  const rl = rateLimit(`code:${purpose}:${email}:${ip}`, 5, 60 * 60 * 1000); // 5 per hour per email+ip
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { code, expiresAt } = await createOrReplaceEmailCode(email, purpose);

  const html = renderCodeEmail(code);
  await sendEmailResend({ subject: 'Your verification code', html, to: email });

  return NextResponse.json({ ok: true, expiresAt });
}


