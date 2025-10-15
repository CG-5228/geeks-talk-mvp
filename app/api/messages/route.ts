import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { moderateMessage } from '@/lib/moderation';

export async function POST(request: Request) {
    const { authorId, content, roomId } = await request.json();
    if (!authorId || !content || !roomId) {
        return NextResponse.json({ error: 'Missing authorId, roomId, or content' }, { status: 400 });
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

    // TODO: Broadcast via Socket.IO when server is wired up
    return NextResponse.json(message, { status: 201 });
}