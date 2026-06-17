import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import type { LiveMessage } from '@/types/live';
import { aggregateReactionsByMessage } from '@/lib/reactions';
import { canAccessRoom, getAccessibleRoom } from '@/lib/live/access';

// GET /api/live/channels/[channelId]/pins - List pinned messages for a channel
export async function GET(req: NextRequest, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = params;
    const room = await getAccessibleRoom(channelId);
    if (!room) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    if (!canAccessRoom(room, session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const roomId = room.id;

    const items = await db.message.findMany({
      where: { roomId, pinnedAt: { not: null }, unsent: false },
      orderBy: { pinnedAt: 'desc' },
      take: 50,
      include: {
        author: { select: { id: true, name: true, image: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, name: true, image: true } },
          },
        },
        files: {
          include: {
            file: {
              include: { uploader: { select: { id: true, name: true, image: true } } },
            },
          },
        },
      },
    });

    const reactionMap = await aggregateReactionsByMessage(items.map((m) => m.id), 'channel');

    const messages: LiveMessage[] = items.map((m) => ({
      id: m.id,
      channelId: m.roomId,
      authorId: m.authorId,
      authorName: m.author?.name || 'User',
      authorImage: m.author?.image || null,
      content: m.content,
      type: 'text' as const,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      editedAt: m.editedAt ? (m.editedAt instanceof Date ? m.editedAt.toISOString() : m.editedAt) : null,
      pinnedAt: m.pinnedAt ? (m.pinnedAt instanceof Date ? m.pinnedAt.toISOString() : m.pinnedAt) : null,
      pinnedBy: m.pinnedBy ?? null,
      replyToId: m.replyToId,
      replyTo: m.replyTo
        ? {
            id: m.replyTo.id,
            content: m.replyTo.content,
            authorName: m.replyTo.author?.name || 'User',
            authorImage: m.replyTo.author?.image || null,
          }
        : null,
      files:
        m.files?.map((f) => ({
          id: f.file.id,
          name: f.file.fileName,
          type: f.file.fileType,
          url: f.file.fileType.startsWith('image/')
            ? `/api/live/channels/${m.roomId}/files/${f.file.id}/view`
            : `/api/live/channels/${m.roomId}/files/${f.file.id}`,
          size: f.file.fileSize,
          uploader: {
            id: f.file.uploader.id,
            name: f.file.uploader.name || 'Unknown User',
            image: f.file.uploader.image,
          },
        })) || [],
      reactions: reactionMap[m.id] || [],
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error listing pins:', error);
    return NextResponse.json({ error: 'Failed to list pinned messages' }, { status: 500 });
  }
}
