import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGate';

export async function DELETE(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
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

    // Only the channel owner may delete it. Ownerless (seeded/public) channels
    // and channels owned by someone else require admin privileges — otherwise
    // any user could delete the default seeded channels and every message in
    // them, since those rows have a null ownerId.
    if (channel.ownerId !== userId) {
      const gate = await requireAdmin();
      if (!gate.ok) {
        return NextResponse.json({ error: 'Unauthorized to delete this channel' }, { status: 403 });
      }
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
