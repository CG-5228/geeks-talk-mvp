import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const UsernameSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/)
}).partial();

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = UsernameSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const errorMessage = errors.formErrors?.[0] || 
      errors.fieldErrors?.username?.[0] || 
      'Invalid username. Must be 3-24 characters and contain only letters, numbers, and underscores.';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
  const { username } = parsed.data;
  try {
    const updated = await db.user.update({
      where: { id: (session.user as any).id },
      data: { username: username ?? undefined },
      select: { id: true, name: true, email: true, image: true, username: true }
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
