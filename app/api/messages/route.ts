import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { moderateMessage } from '@/lib/moderation';

export async function POST(request: Request) {
    let authorId, content, roomId;
    
    try {
        const body = await request.json();
        authorId = body.authorId;
        content = body.content;
        roomId = body.roomId;
        
        if (!authorId || !content || !roomId) {
            return NextResponse.json({ error: 'Missing authorId, roomId, or content' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const rl = rateLimit(`messages:${authorId}`);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const flagged = await moderateMessage(content);
    if (flagged) {
        return NextResponse.json({ error: 'Message moderated' }, { status: 403 });
    }

    const message = await db.message.create({
        data: {
            content,
            roomId,
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