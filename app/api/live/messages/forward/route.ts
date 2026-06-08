import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireNotBanned } from '@/lib/banEnforce';
import { canAccessRoom, getAccessibleRoom } from '@/lib/live/access';

// POST /api/live/messages/forward - Forward a message to multiple destinations
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const banCheck = await requireNotBanned(session.user.id);
    if (!banCheck.ok) return banCheck.response;

    const body = await req.json();
    const { messageId, messageType, destinations } = body;

    if (!messageId || !messageType || !destinations || !Array.isArray(destinations)) {
      return NextResponse.json(
        { error: 'messageId, messageType, and destinations array are required' },
        { status: 400 }
      );
    }

    if (destinations.length === 0) {
      return NextResponse.json(
        { error: 'At least one destination is required' },
        { status: 400 }
      );
    }

    // Get the original message
    let originalMessage: any;
    if (messageType === 'channel') {
      originalMessage = await db.message.findUnique({
        where: { id: messageId },
        select: { id: true, content: true, authorId: true, createdAt: true, roomId: true, author: { select: { name: true } }, room: { select: { name: true } } },
      });
    } else {
      originalMessage = await db.directMessage.findUnique({
        where: { id: messageId },
        select: { id: true, content: true, senderId: true, receiverId: true, createdAt: true, sender: { select: { name: true } } },
      });
    }

    if (!originalMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Authorize that the caller may READ the source before forwarding its
    // content. Previously any authenticated user could forward (and thereby
    // exfiltrate) any message or DM by id — including private channels and
    // other people's DMs.
    if (messageType === 'channel') {
      const sourceRoom = await getAccessibleRoom(originalMessage.roomId);
      if (!sourceRoom || !canAccessRoom(sourceRoom, session.user.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (
      originalMessage.senderId !== session.user.id &&
      originalMessage.receiverId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const forwardedMessages = [];
    const errors = [];

    // Forward to each destination (channelId or userId)
    for (const destinationId of destinations) {
      try {
        // First, check if destination is a user (forward to DM by userId)
        const user = await db.user.findUnique({ where: { id: destinationId }, select: { id: true, name: true } });
        if (user && user.id !== session.user.id) {
          const metaAuthor = messageType === 'channel' ? (originalMessage.author?.name || 'User') : (originalMessage.sender?.name || 'User');
          const metaChannel = messageType === 'channel' ? `#${originalMessage.room?.name || 'channel'}` : 'Direct Message';
          const metaTime = originalMessage.createdAt ? new Date(originalMessage.createdAt as any).toLocaleString() : '';
          const constructed = `Forwarded from ${metaAuthor} • ${metaChannel} • ${metaTime}\n${originalMessage.content}`;
          const [a, b] = [session.user.id, user.id].sort();
          const conversationId = `${a}-${b}`;
          const dmMessage = await db.directMessage.create({
            data: {
              content: constructed,
              conversationId,
              senderId: session.user.id,
              receiverId: user.id,
              // store original reference in content for now (models may not support fields)
            },
          });
          forwardedMessages.push({ type: 'dm', id: dmMessage.id, destination: user.name || user.id });
          continue;
        }

        // Otherwise, try as a channel room ID. The caller must be allowed to
        // post to the destination (public channels are open; private require
        // membership) and the channel must not be archived.
        const room = await db.room.findUnique({
          where: { id: destinationId },
          select: { id: true, name: true, isDM: true, archived: true, visibility: true, ownerId: true, users: { select: { id: true } } },
        });
        if (room && !room.isDM) {
          if (room.archived || !canAccessRoom(room, session.user.id)) {
            errors.push(`Not allowed to forward to ${room.name || destinationId}`);
            continue;
          }
          const metaAuthor = messageType === 'channel' ? (originalMessage.author?.name || 'User') : (originalMessage.sender?.name || 'User');
          const metaChannel = messageType === 'channel' ? `#${originalMessage.room?.name || 'channel'}` : 'Direct Message';
          const metaTime = originalMessage.createdAt ? new Date(originalMessage.createdAt as any).toLocaleString() : '';
          const constructed = `Forwarded from ${metaAuthor} • ${metaChannel} • ${metaTime}\n${originalMessage.content}`;
          const channelMessage = await db.message.create({
            data: {
              content: constructed,
              authorId: session.user.id,
              roomId: destinationId,
              // reference fields omitted if not present in schema
            },
          });
          forwardedMessages.push({ type: 'channel', id: channelMessage.id, destination: room.name });
          continue;
        }

        // If nothing matched, report error
        errors.push(`Destination ${destinationId} not found`);
      } catch (error) {
        console.error(`Error forwarding to ${destinationId}:`, error);
        errors.push(`Failed to forward to ${destinationId}`);
      }
    }

    return NextResponse.json({
      success: true,
      forwardedCount: forwardedMessages.length,
      forwardedMessages,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error forwarding message:', error);
    return NextResponse.json(
      { error: 'Failed to forward message' },
      { status: 500 }
    );
  }
}