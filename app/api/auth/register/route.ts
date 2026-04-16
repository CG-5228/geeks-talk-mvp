import { NextResponse } from 'next/server';
import { RegisterSchema } from '@/lib/validators';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rateLimit';
import { isAllowedEmailDomain, verifyAndConsumeEmailCode } from '@/lib/verification';

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || 'local';
  const rl = rateLimit(`register:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const json = await req.json();
  const parse = RegisterSchema.safeParse(json);
  if (!parse.success) {
    const { fieldErrors } = parse.error.flatten();
    return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
  }

  const { username, email, password, code } = (parse.data as any);

  if (!isAllowedEmailDomain(email)) {
    return NextResponse.json({ error: 'Email provider not supported', fieldErrors: { email: ['Only icloud/gmail/outlook/yahoo/qq are allowed'] } }, { status: 400 });
  }

  // Ensure unique username and email
  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: 'Email already in use', fieldErrors: { email: ['Email already in use'] } }, { status: 409 });
  }
  const existingUser = await db.user.findUnique({ where: { username } });
  if (existingUser) {
    return NextResponse.json({ error: 'Username already in use', fieldErrors: { username: ['Username already in use'] } }, { status: 409 });
  }

  // Require verified code
  if (!code) {
    return NextResponse.json({ error: 'Verification code required', fieldErrors: { code: ['Verification code required'] } }, { status: 400 });
  }
  const verification = await verifyAndConsumeEmailCode(email, 'signup', code);
  if (!verification.ok) {
    return NextResponse.json({ error: 'Invalid verification code', fieldErrors: { code: ['Invalid or expired code'] } }, { status: 400 });
  }

  const hashed = await hashPassword(password);
  await db.user.create({
    data: {
      email,
      username,
      hashedPassword: hashed,
      role: 'user',
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
