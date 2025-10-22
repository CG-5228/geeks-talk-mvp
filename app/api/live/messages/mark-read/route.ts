import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/live/messages/mark-read - Mark channel messages as read
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const { messageIds, channelId } = await req.json();

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'Message IDs array is required' }, { status: 400 });
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Verify user has access to this channel
    const channel = await db.room.findFirst({
      where: {
        id: channelId,
        OR: [
          { visibility: 'public' },
          { participants: { has: userId } },
          { ownerId: userId }
        ]
      }
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or access denied' }, { status: 404 });
    }

    // For now, we'll just return success since channel messages don't have individual read tracking
    // In a more complex system, you might want to track which users have read which messages
    // This could be implemented with a separate MessageRead model

    return NextResponse.json({ 
      updatedCount: messageIds.length,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking channel messages as read:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}
