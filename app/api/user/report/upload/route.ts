import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToS3 } from '@/lib/s3';
import { sniffImageType } from '@/lib/uploads';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Allow common image/doc types. Many mobile devices upload HEIC/HEIF or missing mime types.
    const mimeType = file.type || '';
    const fileNameLower = (file.name || '').toLowerCase();
    // Reject SVG outright (XSS vector).
    if (mimeType === 'image/svg+xml' || /\.svg$/i.test(fileNameLower)) {
      return NextResponse.json({ error: 'SVG files are not allowed' }, { status: 400 });
    }
    const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(fileNameLower);
    const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(fileNameLower);
    const isText = mimeType === 'text/plain' || /\.txt$/i.test(fileNameLower);
    if (!isImage && !isPdf && !isText) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an image or PDF/TXT.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate by magic bytes — never trust client mime/extension.
    // Text files have no reliable signature, so they are stored as
    // application/octet-stream (so they download rather than render).
    let contentType: string;
    if (isText) {
      contentType = 'application/octet-stream';
    } else {
      const sniffed = sniffImageType(buffer);
      if (isPdf) {
        if (sniffed !== 'application/pdf') {
          return NextResponse.json({ error: 'File content does not match a valid PDF' }, { status: 400 });
        }
        contentType = 'application/pdf';
      } else {
        if (sniffed !== 'image/png' && sniffed !== 'image/jpeg' && sniffed !== 'image/gif' && sniffed !== 'image/webp' && sniffed !== 'image/heic') {
          return NextResponse.json({ error: 'File content does not match a valid image' }, { status: 400 });
        }
        contentType = sniffed;
      }
    }

    let uploadResult;
    try {
      uploadResult = await uploadToS3(
        buffer,
        file.name || 'attachment',
        `report-attachments/${session.user.id}`,
        contentType
      );
    } catch (s3Error) {
      console.error('Failed to upload report attachment:', s3Error);
      return NextResponse.json(
        { error: 'Failed to upload file to storage. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      file: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        s3Key: uploadResult.key,
        s3Url: uploadResult.url
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
