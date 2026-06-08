import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { publish } from '@/lib/liveBus';

async function canPin(userId: string, roomId: string): Promise<boolean> {
  const [user, room] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { role: true } }),
    db.room.findUnique({ where: { id: roomId }, select: { ownerId: true } }),
  ]);
  if (!user || !room) return false;
  return user.role === 'admin' || room.ownerId === userId;
}

// POST /api/live/messages/[messageId]/pin - Pin a message
export async function POST(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;
    const existing = await db.message.findUnique({
      where: { id: messageId },
      select: { id: true, roomId: true, pinnedAt: true, unsent: true },
    });
    if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    if (existing.unsent) return NextResponse.json({ error: 'Cannot pin an unsent message' }, { status: 400 });

    if (!(await canPin(session.user.id, existing.roomId))) {
      return NextResponse.json({ error: 'Only channel owners or admins can pin messages' }, { status: 403 });
    }

    if (existing.pinnedAt) {
      return NextResponse.json({ success: true, alreadyPinned: true });
    }

    const updated = await db.message.update({
      where: { id: messageId },
      data: { pinnedAt: new Date(), pinnedBy: session.user.id },
      select: { id: true, pinnedAt: true, pinnedBy: true, roomId: true },
    });

    publish(`channel:${updated.roomId}`, 'message:pinned', {
      messageId: updated.id,
      pinnedAt: updated.pinnedAt?.toISOString() ?? null,
      pinnedBy: updated.pinnedBy,
    });

    return NextResponse.json({
      success: true,
      pinnedAt: updated.pinnedAt?.toISOString() ?? null,
      pinnedBy: updated.pinnedBy,
    });
  } catch (error) {
    console.error('Error pinning message:', error);
    return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 });
  }
}

// DELETE /api/live/messages/[messageId]/pin - Unpin a message
export async function DELETE(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;
    const existing = await db.message.findUnique({
      where: { id: messageId },
      select: { id: true, roomId: true, pinnedAt: true },
    });
    if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    if (!(await canPin(session.user.id, existing.roomId))) {
      return NextResponse.json({ error: 'Only channel owners or admins can unpin messages' }, { status: 403 });
    }

    if (!existing.pinnedAt) {
      return NextResponse.json({ success: true, alreadyUnpinned: true });
    }

    await db.message.update({
      where: { id: messageId },
      data: { pinnedAt: null, pinnedBy: null },
    });

    publish(`channel:${existing.roomId}`, 'message:unpinned', { messageId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unpinning message:', error);
    return NextResponse.json({ error: 'Failed to unpin message' }, { status: 500 });
  }
}
