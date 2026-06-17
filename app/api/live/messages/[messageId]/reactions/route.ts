import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { publish } from '@/lib/liveBus';
import { aggregateReactionsByMessage } from '@/lib/reactions';
import { canAccessRoom, getAccessibleRoom } from '@/lib/live/access';

// POST /api/live/messages/[messageId]/reactions - Add reaction to channel message
export async function POST(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;
    const body = await req.json();
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    // Validate emoji (basic check)
    const validEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    if (!validEmojis.includes(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    // Check if message exists
    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { id: true, authorId: true, roomId: true },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const room = await getAccessibleRoom(message.roomId);
    if (!room || !canAccessRoom(room, session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if reaction already exists
    const existingReaction = await db.messageReaction.findFirst({
      where: {
        messageId: messageId,
        userId: session.user.id,
        emoji: emoji,
      },
    });

    let action: 'added' | 'removed';
    if (existingReaction) {
      await db.messageReaction.delete({ where: { id: existingReaction.id } });
      action = 'removed';
    } else {
      await db.messageReaction.create({
        data: {
          messageId: messageId,
          messageType: 'channel',
          userId: session.user.id,
          emoji: emoji,
        },
      });
      action = 'added';
    }

    // Publish the post-write aggregated summary so clients can replace the
    // optimistic state with server truth.
    try {
      const map = await aggregateReactionsByMessage([messageId], 'channel');
      publish(`channel:${message.roomId}`, 'reaction:updated', {
        messageId,
        messageType: 'channel',
        reactions: map[messageId] || [],
      });
    } catch (err) {
      console.error('Failed to publish reaction update:', err);
    }

    return NextResponse.json({
      action,
      emoji,
      message: action === 'added' ? 'Reaction added' : 'Reaction removed',
    });
  } catch (error) {
    console.error('Error managing message reaction:', error);
    return NextResponse.json(
      { error: 'Failed to manage reaction' },
      { status: 500 }
    );
  }
}

// GET /api/live/messages/[messageId]/reactions - Get all reactions for a message
export async function GET(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;

    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { roomId: true },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const room = await getAccessibleRoom(message.roomId);
    if (!room || !canAccessRoom(room, session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all reactions for this message
    const reactions = await db.messageReaction.findMany({
      where: {
        messageId: messageId,
        messageType: 'channel',
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push({
        id: reaction.user.id,
        name: reaction.user.name,
        image: reaction.user.image,
      });
      return acc;
    }, {} as Record<string, { emoji: string; count: number; users: any[] }>);

    return NextResponse.json({
      reactions: Object.values(groupedReactions),
    });
  } catch (error) {
    console.error('Error fetching message reactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

// DELETE /api/live/messages/[messageId]/reactions - Remove all reactions from a message (admin only)
export async function DELETE(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { messageId } = params;

    // Remove all reactions for this message
    await db.messageReaction.deleteMany({
      where: {
        messageId: messageId,
        messageType: 'channel',
      },
    });

    return NextResponse.json({
      message: 'All reactions removed',
    });
  } catch (error) {
    console.error('Error removing message reactions:', error);
    return NextResponse.json(
      { error: 'Failed to remove reactions' },
      { status: 500 }
    );
  }
}