import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper function to create conversation ID from two user IDs
function createConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-');
}

// GET /api/live/dms/[conversationId] - Fetch messages for a specific DM conversation
export async function GET(req: Request, props: { params: Promise<{ conversationId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { conversationId } = params;

  try {
    // Verify user is part of this conversation
    const conversation = await db.directMessage.findFirst({
      where: {
        conversationId,
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages for this conversation (exclude unsent messages)
    const messages = await db.directMessage.findMany({
      where: { 
        conversationId,
        unsent: false // Only get non-unsent messages
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
            sender: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Format messages
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      read: msg.read,
      createdAt: msg.createdAt.toISOString(),
      replyToId: msg.replyToId,
      replyTo: msg.replyTo,
      sender: msg.sender,
      receiver: msg.receiver
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching DM messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// PATCH /api/live/dms/[conversationId] - Mark messages as read
export async function PATCH(req: Request, props: { params: Promise<{ conversationId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { conversationId } = params;

  try {
    // Mark all unread messages in this conversation as read
    const result = await db.directMessage.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        read: false
      },
      data: {
        read: true
      }
    });

    return NextResponse.json({ 
      updatedCount: result.count,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}
