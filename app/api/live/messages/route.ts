import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import type { LiveMessage } from '@/types/live';
import { emitToRoom } from '@/lib/socket';
import { aggregateReactionsByMessage } from '@/lib/reactions';
import { requireNotBanned } from '@/lib/banEnforce';
import { canAccessRoom, getAccessibleRoom } from '@/lib/live/access';

// In-memory fallback for local/dev without DB
const mem: { messages: LiveMessage[] } = { messages: [] };

// GET /api/live/messages?channel=<id|slug>&cursor=<id>&limit=50
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);
  if (!channel) return NextResponse.json({ error: 'Missing channel' }, { status: 400 });
  try {
    // Resolve the channel (id or slug) and verify the caller may read it. The
    // GET path previously had no auth or membership check, so any visitor could
    // read any channel's messages — including private channels — by id or slug.
    const room = await getAccessibleRoom(channel);
    if (!room) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    if (!canAccessRoom(room, session.user.id)) {
      return NextResponse.json({ error: 'Access denied to channel' }, { status: 403 });
    }
    const roomId = room.id;
    const items = await db.message.findMany({
      where: {
        roomId,
        unsent: false // Only get non-unsent messages
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, image: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        },
        files: {
          include: {
            file: {
              include: {
                uploader: {
                  select: { id: true, name: true, image: true }
                }
              }
            }
          }
        }
      },
    });
    const nextCursor = items.length === limit ? items[items.length - 1].id : null;
    const reactionMap = await aggregateReactionsByMessage(items.map((m) => m.id), 'channel');
    // Count replies per message (threads are a reuse of replyToId)
    const replyCounts = await db.message.groupBy({
      by: ['replyToId'],
      where: { replyToId: { in: items.map((m) => m.id) }, unsent: false },
      _count: { _all: true },
    });
    const replyCountMap = Object.fromEntries(
      replyCounts.map((r) => [r.replyToId as string, r._count._all])
    );
    const messages: LiveMessage[] = items
      .map((m) => ({
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
        replyTo: m.replyTo ? {
          id: m.replyTo.id,
          content: m.replyTo.content,
          authorName: m.replyTo.author?.name || 'User',
          authorImage: m.replyTo.author?.image || null,
        } : null,
        replyCount: replyCountMap[m.id] ?? 0,
        files: m.files?.map(f => ({
          id: f.file.id,
          name: f.file.fileName,
          type: f.file.fileType,
          url: f.file.fileType.startsWith('image/')
            ? `/api/live/channels/${m.roomId}/files/${f.file.id}/view` // View URL for images
            : `/api/live/channels/${m.roomId}/files/${f.file.id}`, // Download URL for other files
          size: f.file.fileSize,
          uploader: {
            id: f.file.uploader.id,
            name: f.file.uploader.name || 'Unknown User',
            image: f.file.uploader.image
          }
        })) || [],
        reactions: reactionMap[m.id] || [],
      }))
      .reverse();
    return NextResponse.json({ messages, nextCursor });
  } catch (e) {
    // Fallback memory
    const items = mem.messages.filter((m) => m.channelId === channel).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const start = cursor ? Math.max(0, items.findIndex((m) => m.id === cursor) + 1) : Math.max(0, items.length - limit);
    const slice = items.slice(start, start + limit);
    const nextCursor = slice.length === limit ? slice[slice.length - 1].id : null;
    return NextResponse.json({ messages: slice, nextCursor });
  }
}

// POST /api/live/messages  { channelId, content, files? }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const banCheck = await requireNotBanned(session.user.id);
  if (!banCheck.ok) return banCheck.response;
  const body = await req.json().catch(() => null);
  const channelId = body?.channelId;
  const content = (body?.content || '').toString();
  const replyToId = body?.replyToId;
  const files = body?.files || [];
  if (!channelId || (!content.trim() && files.length === 0)) return NextResponse.json({ error: 'channelId and content or files required' }, { status: 400 });

  try {
    let roomId = channelId;
    const isId = isUUID(channelId) || isCuid(channelId);
    if (!isId) {
      const room = await db.room.findUnique({
        where: { slug: channelId },
        include: { users: { select: { id: true } } }
      });
      if (!room) {

        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }

      // Check if user has access to the room (for now, allow all users for public rooms)
      if (room.visibility === 'private') {
        const hasAccess = room.users.some(user => user.id === session.user.id) || room.ownerId === session.user.id;
        if (!hasAccess) {

          return NextResponse.json({ error: 'Access denied to channel' }, { status: 403 });
        }
      }

      roomId = room.id;

    } else {
      // If it's a UUID, verify the room exists and user has access
      const room = await db.room.findUnique({
        where: { id: channelId },
        include: { users: { select: { id: true } } }
      });
      if (!room) {

        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }

      // Check if user has access to the room (for now, allow all users for public rooms)
      if (room.visibility === 'private') {
        const hasAccess = room.users.some(user => user.id === session.user.id) || room.ownerId === session.user.id;
        if (!hasAccess) {

          return NextResponse.json({ error: 'Access denied to channel' }, { status: 403 });
        }
      }
    }

    // If files are attached, append file information to content
    let messageContent = content;
    if (files && files.length > 0) {
      const fileList = files.map((file: any) => `📎 ${file.name}`).join('\n');
      messageContent = content ? `${content}\n\n${fileList}` : fileList;
    }

    const created = await db.message.create({
      data: {
        roomId,
        authorId: session.user.id,
        content: messageContent,
        replyToId,
        // Create MessageFile records for each attached file
        files: files && files.length > 0 ? {
          create: files.map((file: any) => ({
            fileId: file.id
          }))
        } : undefined
      },
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
              include: {
                uploader: {
                  select: { id: true, name: true, image: true }
                }
              }
            }
          }
        }
      },
    });

    // Track message activity for analytics
    try {
      const { trackUserActivity } = await import('@/lib/analytics');
      await trackUserActivity((session.user as any).id, 'message');
    } catch (error) {
      console.error('Failed to track message activity:', error);
    }
    const msg: LiveMessage = {
      id: created.id,
      channelId: created.roomId,
      authorId: created.authorId,
      authorName: created.author?.name || 'User',
      authorImage: created.author?.image || null,
      content: created.content,
      type: 'text' as const,
      createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : created.createdAt,
      editedAt: null,
      pinnedAt: null,
      pinnedBy: null,
      replyCount: 0,
      replyToId: created.replyToId ?? undefined,
      replyTo: created.replyTo
        ? {
            id: created.replyTo.id,
            content: created.replyTo.content,
            authorName: created.replyTo.author?.name || 'User',
            authorImage: created.replyTo.author?.image || null,
          }
        : null,
      // Include files immediately so clients can render previews without waiting for next poll
      files: created.files?.map((f) => ({
        id: f.file.id,
        name: f.file.fileName,
        type: f.file.fileType,
        url: f.file.fileType.startsWith('image/')
          ? `/api/live/channels/${created.roomId}/files/${f.file.id}/view`
          : `/api/live/channels/${created.roomId}/files/${f.file.id}`,
        size: f.file.fileSize,
        uploader: {
          id: f.file.uploader.id,
          name: f.file.uploader.name || 'Unknown User',
          image: f.file.uploader.image,
        },
      })) || [],
      reactions: [],
    };
    // Broadcast to listeners in the channel room
    emitToRoom(`channel:${msg.channelId}`, 'message:new', msg);
    return NextResponse.json(msg, { status: 201 });
  } catch (e) {
    // Fail loudly. Previously this branch fabricated a fake 201 response and
    // pushed the message to an in-memory buffer, which made the client believe
    // the send succeeded while the row was never persisted to the DB. That's
    // exactly why messages "disappeared" after switching channels: the next
    // GET read from the DB and found nothing. Return a real error instead so
    // the UI can surface the failure and the user can retry.
    const err = e as { code?: string; meta?: unknown; message?: string };
    console.error('[POST /api/live/messages] DB write failed', {
      channelId,
      userId: session.user.id,
      contentPreview: content.slice(0, 80),
      hasFiles: Array.isArray(files) && files.length > 0,
      prismaCode: err?.code,
      prismaMeta: err?.meta,
      message: err?.message,
      stack: e instanceof Error ? e.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isCuid(v: string) {
  // Prisma's cuid typically starts with 'c' and is 25 chars, lowercase alphanumerics
  return /^c[a-z0-9]{24}$/i.test(v);
}
