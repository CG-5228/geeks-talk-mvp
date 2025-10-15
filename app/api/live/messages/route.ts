import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
    if (!isUUID(channel)) {
      const room = await db.room.findUnique({ where: { slug: channel } });
      if (!room) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      roomId = room.id;
    }
    const items = await db.message.findMany({
      where: { roomId },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, image: true } } },
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

// POST /api/live/messages  { channelId, content }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const channelId = body?.channelId;
  const content = (body?.content || '').toString();
  if (!channelId || !content.trim()) return NextResponse.json({ error: 'channelId and content required' }, { status: 400 });
  try {
    let roomId = channelId;
    if (!isUUID(channelId)) {
      const room = await db.room.findUnique({ where: { slug: channelId } });
      if (!room) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      roomId = room.id;
    }
    const created = await db.message.create({
      data: { roomId, authorId: (session.user as any).id, content },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
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
    const msg: LiveMessage = {
      id: Math.random().toString(36).slice(2),
      channelId,
      authorId: (session.user as any).id,
      authorName: session.user.name || 'You',
      authorImage: (session.user as any).image || null,
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
