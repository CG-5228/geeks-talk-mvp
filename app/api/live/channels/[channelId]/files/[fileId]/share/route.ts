import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPresignedUrl } from '@/lib/s3';
import { requireNotBanned } from '@/lib/banEnforce';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ channelId: string; fileId: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const banCheck = await requireNotBanned(session.user.id);
  if (!banCheck.ok) return banCheck.response;

  try {
    const { channelId, fileId } = params;
    const body = await request.json();
    const { type, targetId } = body; // type: 'channel' | 'dm' | 'save', targetId: channelId or conversationId

    if (!type) {
      return NextResponse.json({ error: 'Share type is required' }, { status: 400 });
    }

    // Get file
    const file = await db.channelFile.findFirst({
      where: {
        id: fileId,
        channelId,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has access to the source channel
    const sourceChannel = await db.room.findUnique({
      where: { id: channelId },
      select: { 
        id: true, 
        visibility: true, 
        participants: true,
        ownerId: true 
      },
    });

    if (!sourceChannel) {
      return NextResponse.json({ error: 'Source channel not found' }, { status: 404 });
    }

    const canAccessSource = sourceChannel.visibility === 'public' || 
                           sourceChannel.participants.includes(session.user.id) ||
                           sourceChannel.ownerId === session.user.id;

    if (!canAccessSource) {
      return NextResponse.json({ error: 'Access denied to source channel' }, { status: 403 });
    }

    if (type === 'save') {
      // Generate long-lived download URL (24 hours)
      const downloadUrl = await getPresignedUrl(file.s3Key, 86400);
      
      return NextResponse.json({
        success: true,
        downloadUrl,
        message: 'File saved successfully. Download link expires in 24 hours.',
      });
    }

    if (type === 'channel' && targetId) {
      // Check if user has access to target channel
      const targetChannel = await db.room.findUnique({
        where: { id: targetId },
        select: { 
          id: true, 
          visibility: true, 
          participants: true,
          ownerId: true 
        },
      });

      if (!targetChannel) {
        return NextResponse.json({ error: 'Target channel not found' }, { status: 404 });
      }

      const canAccessTarget = targetChannel.visibility === 'public' || 
                             targetChannel.participants.includes(session.user.id) ||
                             targetChannel.ownerId === session.user.id;

      if (!canAccessTarget) {
        return NextResponse.json({ error: 'Access denied to target channel' }, { status: 403 });
      }

      // Create a message in the target channel with file reference
      const message = await db.message.create({
        data: {
          content: `📎 Shared file: ${file.fileName}`,
          roomId: targetId,
          authorId: session.user.id,
          forwardedFrom: file.id,
          forwardedFromType: 'channel_file',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'File shared to channel successfully',
        messageId: message.id,
      });
    }

    if (type === 'dm' && targetId) {
      // Check if DM conversation exists and user has access
      const conversation = await db.directMessage.findFirst({
        where: {
          id: targetId,
          OR: [
            { senderId: session.user.id },
            { receiverId: session.user.id },
          ],
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: 'DM conversation not found or access denied' }, { status: 404 });
      }

      // Create a message in the DM with file reference
      const message = await db.directMessage.create({
        data: {
          conversationId: targetId,
          content: `📎 Shared file: ${file.fileName}`,
          senderId: session.user.id,
          receiverId: conversation.senderId === session.user.id ? conversation.receiverId : conversation.senderId,
          forwardedFrom: file.id,
          forwardedFromType: 'channel_file',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'File shared to DM successfully',
        messageId: message.id,
      });
    }

    return NextResponse.json({ error: 'Invalid share type or missing target ID' }, { status: 400 });

  } catch (error) {
    console.error('Error sharing file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
