import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { moderateMessage } from '@/lib/moderation';
import { requireNotBanned } from '@/lib/banEnforce';
import { canAccessRoom, getAccessibleRoom } from '@/lib/live/access';

export async function POST(request: Request) {
    // Derive the author from the authenticated session — never from the request
    // body. The previous handler trusted body.authorId, letting any caller post
    // messages as any user.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const authorId = session.user.id;

    let content, roomId;
    try {
        const body = await request.json();
        content = body.content;
        roomId = body.roomId;

        if (!content || !roomId) {
            return NextResponse.json({ error: 'Missing roomId or content' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const banCheck = await requireNotBanned(authorId);
    if (!banCheck.ok) return banCheck.response;

    const rl = await rateLimit(`messages:${authorId}`);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify the caller may post to the destination room (public open; private
    // requires membership) to prevent cross-room writes.
    const room = await getAccessibleRoom(roomId);
    if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    if (!canAccessRoom(room, authorId)) {
        return NextResponse.json({ error: 'Access denied to channel' }, { status: 403 });
    }

    const flagged = await moderateMessage(content);
    if (flagged) {
        return NextResponse.json({ error: 'Message moderated' }, { status: 403 });
    }

    const message = await db.message.create({
        data: {
            content,
            roomId: room.id,
            authorId,
        },
    });

    // Track message activity for analytics
    try {
        const { trackUserActivity } = await import('@/lib/analytics');
        await trackUserActivity(authorId, 'message');
    } catch (error) {
        console.error('Failed to track message activity:', error);
    }

    // TODO: Broadcast via Socket.IO when server is wired up
    return NextResponse.json(message, { status: 201 });
}
