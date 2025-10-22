import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { channelId } = params;

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  try {
    // First, verify the user has permission to delete this channel
    const channel = await db.room.findUnique({
      where: { id: channelId },
      select: { id: true, ownerId: true, visibility: true }
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if user is the owner of the channel (for private channels)
    if (channel.visibility === 'private' && channel.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this channel' }, { status: 403 });
    }

    // For public channels, only allow deletion by the owner (if any)
    if (channel.visibility === 'public' && channel.ownerId && channel.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this channel' }, { status: 403 });
    }

    // Delete the channel and all associated data
    await db.$transaction(async (tx) => {
      // Delete all messages in this channel
      await tx.message.deleteMany({
        where: { roomId: channelId }
      });

      // Delete the channel itself
      await tx.room.delete({
        where: { id: channelId }
      });
    });

    return NextResponse.json({
      message: 'Channel deleted successfully',
      channelId: channelId
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting channel:', error);
    return NextResponse.json({
      error: 'Failed to delete channel'
    }, { status: 500 });
  }
}
