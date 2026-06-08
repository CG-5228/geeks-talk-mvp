import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadToS3, getPresignedUrl } from '@/lib/s3';
import { sniffImageType } from '@/lib/uploads';

export async function GET(request: NextRequest, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
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

export async function POST(request: NextRequest, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
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

    // Reject SVG outright (XSS vector), even though it is not in the allowlist.
    if (file.type === 'image/svg+xml') {
      return NextResponse.json({ error: 'SVG files are not allowed' }, { status: 400 });
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'File type not supported. Allowed types: Images, PDF, Text files, Office documents'
      }, { status: 400 });
    }

    // Read bytes and validate by content signature — never trust client mime/extension.
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let contentType: string;
    if (file.type.startsWith('image/')) {
      // HEIC/HEIF use the ISOBMFF `ftyp` box; png/jpeg/gif/webp via the shared sniffer.
      const sniffed = sniffImageType(fileBuffer);
      const isHeic =
        fileBuffer.length >= 12 &&
        fileBuffer.slice(4, 8).toString('ascii') === 'ftyp' &&
        ['heic', 'heix', 'hevc', 'mif1', 'msf1', 'heim', 'heis'].includes(
          fileBuffer.slice(8, 12).toString('ascii'),
        );
      if (
        sniffed !== 'image/png' &&
        sniffed !== 'image/jpeg' &&
        sniffed !== 'image/gif' &&
        sniffed !== 'image/webp' &&
        !isHeic
      ) {
        return NextResponse.json({ error: 'File content does not match a valid image' }, { status: 400 });
      }
      contentType = isHeic ? file.type : sniffed!;
    } else if (file.type === 'application/pdf') {
      // %PDF magic bytes
      if (
        !(
          fileBuffer[0] === 0x25 &&
          fileBuffer[1] === 0x50 &&
          fileBuffer[2] === 0x44 &&
          fileBuffer[3] === 0x46
        )
      ) {
        return NextResponse.json({ error: 'File content does not match a valid PDF' }, { status: 400 });
      }
      contentType = 'application/pdf';
    } else if (file.type === 'text/plain') {
      // Text has no reliable signature; store as octet-stream so it downloads
      // rather than rendering inline.
      contentType = 'application/octet-stream';
    } else {
      // Office documents: OpenXML formats (docx/xlsx/pptx) are ZIP ("PK\x03\x04"),
      // legacy formats (doc/xls/ppt) are OLE compound files (D0 CF 11 E0).
      const isZip =
        fileBuffer[0] === 0x50 &&
        fileBuffer[1] === 0x4b &&
        (fileBuffer[2] === 0x03 || fileBuffer[2] === 0x05 || fileBuffer[2] === 0x07);
      const isOle =
        fileBuffer[0] === 0xd0 &&
        fileBuffer[1] === 0xcf &&
        fileBuffer[2] === 0x11 &&
        fileBuffer[3] === 0xe0;
      if (!isZip && !isOle) {
        return NextResponse.json({ error: 'File content does not match its declared type' }, { status: 400 });
      }
      contentType = file.type;
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    const s3Key = `channel-files/${channelId}/${fileName}`;

    // Upload to S3
    const uploadResult = await uploadToS3(fileBuffer, file.name, `channel-files/${channelId}`, contentType);

    // Save file record to database
    const savedFile = await db.channelFile.create({
      data: {
        channelId,
        fileName: file.name,
        fileType: contentType,
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
