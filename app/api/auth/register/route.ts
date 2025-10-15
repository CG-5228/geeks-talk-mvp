import { NextResponse } from 'next/server';
import { RegisterSchema } from '@/lib/validators';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'local';
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

  const { username, email, password } = parse.data;

  // Ensure unique username and email
  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: 'Email already in use', fieldErrors: { email: ['Email already in use'] } }, { status: 409 });
  }
  const existingUser = await db.user.findUnique({ where: { username } });
  if (existingUser) {
    return NextResponse.json({ error: 'Username already in use', fieldErrors: { username: ['Username already in use'] } }, { status: 409 });
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
