import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPresignedUrl } from '@/lib/s3';
import { canAccessRoom, getAccessibleRoom } from '@/lib/live/access';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ channelId: string; fileId: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { channelId, fileId } = params;

    // Check if user has access to this channel
    const channel = await getAccessibleRoom(channelId);

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    if (!canAccessRoom(channel, session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get file
    const file = await db.channelFile.findFirst({
      where: {
        id: fileId,
        channelId,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Force inline disposition and correct Content-Type so images render in <img> tags
    // rather than triggering a browser download (older uploads may be stored as
    // application/octet-stream).
    const viewUrl = await getPresignedUrl(file.s3Key, 3600 * 24, {
      inline: true,
      contentType: file.fileType,
      fileName: file.fileName,
    });

    return NextResponse.redirect(viewUrl);

  } catch (error) {
    console.error('Error getting file view URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
