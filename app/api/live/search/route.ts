import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { canAccessRoom, getAccessibleRoom } from '@/lib/live/access';

// GET /api/live/search?channelId=<id>&q=<query>&limit=50
// Simple ILIKE substring search scoped to a channel.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);

    if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
    if (q.length < 2) return NextResponse.json({ results: [] });

    // Resolve the channel and verify the caller may read it before searching —
    // otherwise search leaks message content from any (incl. private) channel.
    const room = await getAccessibleRoom(channelId);
    if (!room) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    if (!canAccessRoom(room, session.user.id)) {
      return NextResponse.json({ error: 'Access denied to channel' }, { status: 403 });
    }
    const roomId = room.id;

    const items = await db.message.findMany({
      where: {
        roomId,
        unsent: false,
        content: { contains: q, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    const results = items.map((m) => ({
      id: m.id,
      channelId: m.roomId,
      authorId: m.authorId,
      authorName: m.author?.name || 'User',
      authorImage: m.author?.image || null,
      content: m.content,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching messages:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
