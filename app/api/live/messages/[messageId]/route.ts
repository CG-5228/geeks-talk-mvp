import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// DELETE /api/live/messages/[messageId] - Unsend a channel message
export async function DELETE(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;

    // Find the message
    const message = await db.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        authorId: true,
        createdAt: true,
        content: true,
        unsent: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is the author
    if (message.authorId !== session.user.id) {
      return NextResponse.json({ error: 'You can only unsend your own messages' }, { status: 403 });
    }

    // Check if message is already unsent
    if (message.unsent) {
      return NextResponse.json({
        success: true,
        message: 'Message is already unsent'
      });
    }

    // Check time limit (15 minutes)
    const timeLimit = 15 * 60 * 1000; // 15 minutes in milliseconds
    const messageAge = Date.now() - new Date(message.createdAt).getTime();

    if (messageAge > timeLimit) {
      return NextResponse.json(
        { error: 'Cannot unsend messages older than 15 minutes' },
        { status: 400 }
      );
    }

    // Mark message as unsent (soft delete)
    await db.message.update({
      where: { id: messageId },
      data: { unsent: true },
    });

    // Remove all reactions for this message
    await db.messageReaction.deleteMany({
      where: {
        messageId: messageId,
        messageType: 'channel',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Message unsent successfully',
    });
  } catch (error) {
    console.error('Error unsending message:', error);
    return NextResponse.json(
      { error: 'Failed to unsend message' },
      { status: 500 }
    );
  }
}

// GET /api/live/messages/[messageId] - Get message details (for admin purposes)
export async function GET(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
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

    const message = await db.message.findUnique({
      where: { id: messageId },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        room: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error fetching message details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message details' },
      { status: 500 }
    );
  }
}