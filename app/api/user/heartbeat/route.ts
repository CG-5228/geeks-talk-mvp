import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateOnlineStatus } from '@/lib/analytics';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log('💓 Heartbeat failed - No session found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const status = body.status || 'online';
    const userId = (session.user as any).id;

    // Verify the session userId still exists — prevents P2025 from spamming logs
    // when a client has a stale JWT cookie pointing at a deleted user.
    const exists = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: 'Stale session' }, { status: 401 });
    }

    await updateOnlineStatus(userId, status);

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💓 Failed to update heartbeat:', error);
    return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Just update last seen without changing online status
    await db.user.update({
      where: { id: (session.user as any).id },
      data: { lastSeen: new Date() }
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Stale session' }, { status: 401 });
    }
    console.error('Failed to update last seen:', error);
    return NextResponse.json({ error: 'Failed to update last seen' }, { status: 500 });
  }
}
