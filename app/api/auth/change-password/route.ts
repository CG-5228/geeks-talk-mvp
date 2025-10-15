import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { z } from 'zod';

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d).+$/),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { currentPassword, newPassword } = parsed.data;
  const user = await db.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user?.hashedPassword) return NextResponse.json({ error: 'Password login not enabled for this account' }, { status: 400 });
  const ok = await verifyPassword(currentPassword, user.hashedPassword);
  if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  const hashed = await hashPassword(newPassword);
  await db.user.update({ where: { id: user.id }, data: { hashedPassword: hashed } });
  // TODO: Invalidate other sessions if needed
  return NextResponse.json({ status: 'ok' });
}
