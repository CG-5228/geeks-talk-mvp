import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { targetUserId } = await req.json();
  if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
  // TODO: Persist follow relationship in DB; for now return pending
  return NextResponse.json({ status: 'pending' });
}
