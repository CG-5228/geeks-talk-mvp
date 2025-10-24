import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import type { LiveMessage } from '@/types/live';
import { emitToRoom } from '@/lib/socket';

// In-memory fallback for local/dev without DB
const mem: { messages: LiveMessage[] } = { messages: [] };

// GET /api/live/messages?channel=<id|slug>&cursor=<id>&limit=50
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);
  if (!channel) return NextResponse.json({ error: 'Missing channel' }, { status: 400 });
  try {
    let roomId = channel;
    // Accept both slug and IDs (UUID or Prisma CUID)
    if (!(isUUID(channel) || isCuid(channel))) {
      const room = await db.room.findUnique({ where: { slug: channel } });
      if (!room) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      roomId = room.id;
    }
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
        }
      },
    });
    const nextCursor = items.length === limit ? items[items.length - 1].id : null;
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
        replyToId: m.replyToId,
        replyTo: m.replyTo ? {
          id: m.replyTo.id,
          content: m.replyTo.content,
          authorName: m.replyTo.author?.name || 'User',
          authorImage: m.replyTo.author?.image || null,
        } : null,
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
      data: { roomId, authorId: session.user.id, content: messageContent, replyToId },
      include: { author: { select: { id: true, name: true, image: true } } },
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
    };
    // Broadcast to listeners in the channel room
    emitToRoom(`channel:${msg.channelId}`, 'message:new', msg);
    return NextResponse.json(msg, { status: 201 });
  } catch (e) {
    console.error('Error creating message:', e);
    console.error('Error details:', {
      channelId,
      userId: session.user.id,
      content: content.substring(0, 50) + '...',
      error: e instanceof Error ? e.message : 'Unknown error'
    });

    const msg: LiveMessage = {
      id: Math.random().toString(36).slice(2),
      channelId,
      authorId: session.user.id,
      authorName: session.user.name || 'You',
      authorImage: session.user.image || null,
      content,
      type: 'text' as const,
      createdAt: new Date().toISOString(),
    };
    mem.messages.push(msg);
    emitToRoom(`channel:${msg.channelId}`, 'message:new', msg);
    return NextResponse.json(msg, { status: 201 });
  }
}

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isCuid(v: string) {
  // Prisma's cuid typically starts with 'c' and is 25 chars, lowercase alphanumerics
  return /^c[a-z0-9]{24}$/i.test(v);
}
