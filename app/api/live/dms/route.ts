import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishMany } from '@/lib/liveBus';
import type { DMConversation } from '@/types/live';
import { requireNotBanned } from '@/lib/banEnforce';

// Helper function to create conversation ID from two user IDs
function createConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-');
}

// GET /api/live/dms - List all DM conversations for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    // Get all DM conversations where user is either sender or receiver
    const conversations = await db.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            onlineStatus: true,
            lastSeen: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            onlineStatus: true,
            lastSeen: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by conversation ID and get latest message + unread count
    const conversationMap = new Map<string, {
      lastMessage: any;
      unreadCount: number;
      otherUser: any;
    }>();

    for (const dm of conversations) {
      const conversationId = createConversationId(dm.senderId, dm.receiverId);
      const otherUser = dm.senderId === userId ? dm.receiver : dm.sender;
      
      if (!conversationMap.has(conversationId)) {
        conversationMap.set(conversationId, {
          lastMessage: null,
          unreadCount: 0,
          otherUser
        });
      }

      const conv = conversationMap.get(conversationId)!;
      
      // Update last message if this is newer
      if (!conv.lastMessage || dm.createdAt > conv.lastMessage.createdAt) {
        conv.lastMessage = {
          content: dm.content,
          createdAt: dm.createdAt,
          senderId: dm.senderId
        };
      }

      // Count unread messages (messages sent to current user that are unread)
      if (dm.receiverId === userId && !dm.read) {
        conv.unreadCount++;
      }
    }

    // Convert to DMConversation format
    const dmConversations: DMConversation[] = Array.from(conversationMap.entries()).map(([id, data]) => ({
      id,
      otherUser: {
        id: data.otherUser.id,
        name: data.otherUser.name || 'User',
        username: data.otherUser.username || 'user',
        image: data.otherUser.image,
        onlineStatus: data.otherUser.onlineStatus as 'online' | 'offline' | 'away',
        lastSeen: data.otherUser.lastSeen?.toISOString() || null
      },
      lastMessage: data.lastMessage ? {
        content: data.lastMessage.content,
        createdAt: data.lastMessage.createdAt.toISOString(),
        senderId: data.lastMessage.senderId
      } : null,
      unreadCount: data.unreadCount
    }));

    // Sort by last message time (most recent first)
    dmConversations.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });

    return NextResponse.json({ conversations: dmConversations });
  } catch (error) {
    console.error('Error fetching DM conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/live/dms - Send a DM message
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const banCheck = await requireNotBanned(session.user.id);
  if (!banCheck.ok) return banCheck.response;

  const { receiverId, content, replyToId } = await req.json();
  
  if (!receiverId || !content?.trim()) {
    return NextResponse.json({ error: 'receiverId and content are required' }, { status: 400 });
  }

  const senderId = (session.user as any).id;

  if (senderId === receiverId) {
    return NextResponse.json({ error: 'Cannot send DM to yourself' }, { status: 400 });
  }

  try {
    // Verify receiver exists
    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true, name: true, username: true }
    });

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    const conversationId = createConversationId(senderId, receiverId);

    // Create the DM
    const dm = await db.directMessage.create({
      data: {
        conversationId,
        senderId,
        receiverId,
        content: content.trim(),
        replyToId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, name: true, image: true } },
          },
        },
      }
    });

    const payload = {
      id: dm.id,
      conversationId: dm.conversationId,
      content: dm.content,
      senderId: dm.senderId,
      receiverId: dm.receiverId,
      read: dm.read,
      createdAt: dm.createdAt.toISOString(),
      replyToId: dm.replyToId ?? undefined,
      replyTo: dm.replyTo
        ? {
            id: dm.replyTo.id,
            content: dm.replyTo.content,
            sender: dm.replyTo.sender,
          }
        : null,
      sender: dm.sender,
      receiver: dm.receiver,
    };

    // Deliver to both participants' user streams.
    publishMany([`user:${senderId}`, `user:${receiverId}`], 'dm:new', payload);

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error('Error sending DM:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
