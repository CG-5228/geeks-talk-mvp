import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadToS3, getPresignedUrl } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { channelId } = params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    // Build where clause for filtering
    const whereClause: any = {
      channelId,
    };

    if (search) {
      whereClause.fileName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    // Get files for this channel
    const files = await db.channelFile.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Generate presigned URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const downloadUrl = await getPresignedUrl(file.s3Key, 3600); // 1 hour expiry
          return {
            ...file,
            downloadUrl,
          };
        } catch (error) {
          console.error('Error generating presigned URL for file:', file.id, error);
          return {
            ...file,
            downloadUrl: null,
          };
        }
      })
    );

    return NextResponse.json({
      files: filesWithUrls,
      total: filesWithUrls.length,
    });

  } catch (error) {
    console.error('Error fetching channel files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel files' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { channelId } = params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

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

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 50MB' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File type not supported. Allowed types: Images, PDF, Text files, Office documents' 
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    const s3Key = `channel-files/${channelId}/${fileName}`;

    // Upload to S3
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadToS3(fileBuffer, file.name, `channel-files/${channelId}`, file.type);

    // Save file record to database
    const savedFile = await db.channelFile.create({
      data: {
        channelId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        s3Key: uploadResult.key,
        uploaderId: session.user.id,
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

    // Generate download URL
    const downloadUrl = await getPresignedUrl(savedFile.s3Key, 3600);

    return NextResponse.json({
      file: {
        ...savedFile,
        downloadUrl,
      },
      message: 'File uploaded successfully',
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
