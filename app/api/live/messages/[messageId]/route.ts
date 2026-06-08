import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { publish } from '@/lib/liveBus';

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
        roomId: true,
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

    publish(`channel:${message.roomId}`, 'message:deleted', { messageId });

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

// PATCH /api/live/messages/[messageId] - Edit a channel message
export async function PATCH(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;
    const body = await req.json().catch(() => null);
    const content = (body?.content || '').toString().trim();
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });
    if (content.length > 4000) return NextResponse.json({ error: 'Content too long' }, { status: 400 });

    const existing = await db.message.findUnique({
      where: { id: messageId },
      select: { id: true, authorId: true, createdAt: true, unsent: true, roomId: true },
    });
    if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    if (existing.authorId !== session.user.id) {
      return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
    }
    if (existing.unsent) {
      return NextResponse.json({ error: 'Cannot edit an unsent message' }, { status: 400 });
    }

    // 15-minute edit window (matches unsend policy)
    const editWindow = 15 * 60 * 1000;
    if (Date.now() - new Date(existing.createdAt).getTime() > editWindow) {
      return NextResponse.json({ error: 'Cannot edit messages older than 15 minutes' }, { status: 400 });
    }

    const updated = await db.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      select: { id: true, content: true, editedAt: true, roomId: true },
    });

    publish(`channel:${updated.roomId}`, 'message:updated', {
      messageId: updated.id,
      content: updated.content,
      editedAt: updated.editedAt?.toISOString() ?? null,
    });

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      editedAt: updated.editedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Error editing message:', error);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
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