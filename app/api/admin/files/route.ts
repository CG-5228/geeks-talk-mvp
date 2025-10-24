import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deleteFromS3 } from '@/lib/s3';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const channelId = searchParams.get('channelId');
  
  const skip = (page - 1) * limit;
  
  const where = channelId ? { channelId } : {};
  
  const [voiceFiles, channelFiles, voiceTotal, channelTotal] = await Promise.all([
    db.voiceGroupFile.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            image: true
          }
        },
        group: {
          select: {
            id: true,
            groupNumber: true,
            channel: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.channelFile.findMany({
      where: channelId ? { channelId } : {},
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            image: true
          }
        },
        channel: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.voiceGroupFile.count({ where }),
    db.channelFile.count({ where: channelId ? { channelId } : {} })
  ]);

  // Combine and format files
  const files = [
    ...voiceFiles.map(file => ({
      ...file,
      source: 'voice',
      uploadedBy: file.uploader,
      channel: file.group?.channel
    })),
    ...channelFiles.map(file => ({
      ...file,
      source: 'channel',
      uploadedBy: file.uploader,
      channel: file.channel
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = voiceTotal + channelTotal;
  
  return NextResponse.json({
    files,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { fileId } = await req.json();
  if (!fileId) {
    return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
  }
  
  // Try to find the file in both voice and channel file tables
  let file: any = await db.voiceGroupFile.findUnique({
    where: { id: fileId }
  });
  
  let isVoiceFile = true;
  if (!file) {
    file = await db.channelFile.findUnique({
      where: { id: fileId }
    });
    isVoiceFile = false;
  }
  
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  
  // Delete from S3
  try {
    await deleteFromS3(file.s3Key);
  } catch (error) {
    console.error('Failed to delete file from S3:', error);
    // Continue with database deletion even if S3 deletion fails
  }
  
  // Delete from database
  if (isVoiceFile) {
    await db.voiceGroupFile.delete({
      where: { id: fileId }
    });
  } else {
    await db.channelFile.delete({
      where: { id: fileId }
    });
  }
  
  return NextResponse.json({ message: 'File deleted successfully' });
}
