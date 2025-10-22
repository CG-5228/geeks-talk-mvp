import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPresignedUrl, deleteFromS3 } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string; fileId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId, fileId } = params;

    // Check if user is a member of the group
    const membership = await db.voiceGroupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Get file
    const file = await db.voiceGroupFile.findFirst({
      where: {
        id: fileId,
        groupId,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Generate presigned URL for download
    const downloadUrl = await getPresignedUrl(file.s3Key, 3600); // 1 hour expiry

    return NextResponse.json({
      file,
      downloadUrl,
    });

  } catch (error) {
    console.error('Error getting file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; fileId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId, fileId } = params;

    // Check if user is a member of the group
    const membership = await db.voiceGroupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Get file
    const file = await db.voiceGroupFile.findFirst({
      where: {
        id: fileId,
        groupId,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user is the uploader or has admin privileges
    if (file.uploaderId !== session.user.id) {
      return NextResponse.json({ error: 'You can only delete files you uploaded' }, { status: 403 });
    }

    // Delete from S3
    try {
      await deleteFromS3(file.s3Key);
    } catch (error) {
      console.error('Failed to delete file from S3:', error);
    }

    // Delete from database
    await db.voiceGroupFile.delete({
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
