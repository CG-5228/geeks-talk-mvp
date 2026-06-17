import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import type { LiveMessage } from '@/types/live';
import { aggregateReactionsByMessage } from '@/lib/reactions';
import { canAccessRoom, getAccessibleRoom } from '@/lib/live/access';

// GET /api/live/messages/[messageId]/thread - Get the root message plus its replies
export async function GET(req: NextRequest, props: { params: Promise<{ messageId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = params;
    const root = await db.message.findUnique({
      where: { id: messageId },
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
            file: { include: { uploader: { select: { id: true, name: true, image: true } } } },
          },
        },
      },
    });
    if (!root) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });

    const room = await getAccessibleRoom(root.roomId);
    if (!room || !canAccessRoom(room, session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const replies = await db.message.findMany({
      where: { replyToId: messageId, unsent: false },
      orderBy: { createdAt: 'asc' },
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
            file: { include: { uploader: { select: { id: true, name: true, image: true } } } },
          },
        },
      },
    });

    const ids = [root.id, ...replies.map((r) => r.id)];
    const reactionMap = await aggregateReactionsByMessage(ids, 'channel');

    const shape = (m: typeof root): LiveMessage => ({
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
    });

    return NextResponse.json({
      root: shape(root),
      replies: replies.map((r) => shape(r as typeof root)),
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
}
