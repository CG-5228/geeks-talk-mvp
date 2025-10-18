import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { verifyAndConsumeEmailCode, isAllowedEmailDomain } from '@/lib/verification';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: string; code?: string; newPassword?: string };
  const email = (body?.email || '').trim().toLowerCase();
  const code = (body?.code || '').trim();
  const newPassword = (body?.newPassword || '').trim();
  if (!email || !code || !newPassword) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (!isAllowedEmailDomain(email)) return NextResponse.json({ error: 'Email provider not supported' }, { status: 400 });

  const v = await verifyAndConsumeEmailCode(email, 'reset', code);
  if (!v.ok) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const hashed = await hashPassword(newPassword);
  await db.user.update({ where: { id: user.id }, data: { hashedPassword: hashed } });
  return NextResponse.json({ ok: true });
}


