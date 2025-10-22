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

    console.log('💓 Heartbeat received:', { userId: (session.user as any).id, status, timestamp: new Date().toISOString() });

    // Update user's online status and last seen
    await updateOnlineStatus((session.user as any).id, status);

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
  } catch (error) {
    console.error('Failed to update last seen:', error);
    return NextResponse.json({ error: 'Failed to update last seen' }, { status: 500 });
  }
}
