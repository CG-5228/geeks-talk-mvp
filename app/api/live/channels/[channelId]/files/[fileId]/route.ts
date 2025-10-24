import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { getPresignedUrl, deleteFromS3 } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { channelId: string; fileId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { channelId, fileId } = params;

    // Check if user has access to this channel
    const channel = await db.room.findUnique({
      where: { id: channelId },
      select: { 
        id: true, 
        visibility: true, 
        participants: true,
        ownerId: true 
      },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if user can access this channel
    const canAccess = channel.visibility === 'public' || 
                     channel.participants.includes(session.user.id) ||
                     channel.ownerId === session.user.id;

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
            image: true,
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Generate presigned URL for download
    const downloadUrl = await getPresignedUrl(file.s3Key, 3600); // 1 hour expiry

    return NextResponse.json({
      file: {
        ...file,
        downloadUrl,
      },
    });

  } catch (error) {
    console.error('Error getting file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { channelId: string; fileId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { channelId, fileId } = params;

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
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user can delete this file (uploader or admin)
    const isUploader = file.uploaderId === session.user.id;
    const userIsAdmin = await isAdmin(session.user.id);

    if (!isUploader && !userIsAdmin) {
      return NextResponse.json({ error: 'Not authorized to delete this file' }, { status: 403 });
    }

    // Delete from S3
    try {
      await deleteFromS3(file.s3Key);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await db.channelFile.delete({
      where: {
        id: fileId,
      },
    });

    return NextResponse.json({
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
