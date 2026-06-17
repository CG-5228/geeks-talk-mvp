import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishMany } from '@/lib/liveBus';

// DELETE /api/live/dms/message/[messageId] - Unsend a DM message
export async function DELETE(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;

    // Find the message
    const message = await db.directMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        createdAt: true,
        content: true,
        unsent: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is the sender
    if (message.senderId !== session.user.id) {
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
    await db.directMessage.update({
      where: { id: messageId },
      data: { unsent: true },
    });

    // Remove all reactions for this message
    await db.messageReaction.deleteMany({
      where: {
        messageId: messageId,
        messageType: 'dm',
      },
    });

    publishMany(
      [`user:${message.senderId}`, `user:${message.receiverId}`],
      'dm:deleted',
      { messageId }
    );

    return NextResponse.json({
      success: true,
      message: 'Message unsent successfully',
    });
  } catch (error) {
    console.error('Error unsending DM message:', error);
    return NextResponse.json(
      { error: 'Failed to unsend message' },
      { status: 500 }
    );
  }
}

// PATCH /api/live/dms/message/[messageId] - Edit a DM message
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

    const existing = await db.directMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, receiverId: true, createdAt: true, unsent: true },
    });
    if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    if (existing.senderId !== session.user.id) {
      return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
    }
    if (existing.unsent) {
      return NextResponse.json({ error: 'Cannot edit an unsent message' }, { status: 400 });
    }

    const editWindow = 15 * 60 * 1000;
    if (Date.now() - new Date(existing.createdAt).getTime() > editWindow) {
      return NextResponse.json({ error: 'Cannot edit messages older than 15 minutes' }, { status: 400 });
    }

    const updated = await db.directMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      select: { id: true, content: true, editedAt: true, senderId: true, receiverId: true },
    });

    publishMany(
      [`user:${updated.senderId}`, `user:${updated.receiverId}`],
      'dm:updated',
      {
        messageId: updated.id,
        content: updated.content,
        editedAt: updated.editedAt?.toISOString() ?? null,
      }
    );

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      editedAt: updated.editedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Error editing DM message:', error);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  }
}

// GET /api/live/dms/message/[messageId] - Get DM message details (for admin purposes)
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

    const message = await db.directMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        receiver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error fetching DM message details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message details' },
      { status: 500 }
    );
  }
}