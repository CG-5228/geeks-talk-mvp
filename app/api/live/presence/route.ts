import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { presenceCounts } from '@/lib/live/presence';
import { db } from '@/lib/db';
import { publish } from '@/lib/liveBus';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { channelIds, status } = await req.json();
  const currentUserId = (session.user as any).id;

  // Handle channel presence counts (existing functionality)
  if (channelIds && Array.isArray(channelIds)) {
    const counts = await presenceCounts(channelIds);
    return NextResponse.json(counts);
  }

  // Handle global user status updates
  if (status && ['online', 'offline', 'away'].includes(status)) {
    try {
      // Update user's online status
      await db.user.update({
        where: { id: currentUserId },
        data: {
          onlineStatus: status,
          lastSeen: status === 'offline' ? new Date() : undefined
        }
      });

      publish('presence', 'presence:update', {
        userId: currentUserId,
        status,
        at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        status,
        userId: currentUserId,
      });
    } catch (error: any) {
      // P2025: session userId no longer exists (e.g. user deleted, DB reset).
      // Signal the client to re-authenticate instead of surfacing a 500.
      if (error?.code === 'P2025') {
        return NextResponse.json({ error: 'Stale session' }, { status: 401 });
      }
      console.error('Error updating user status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
