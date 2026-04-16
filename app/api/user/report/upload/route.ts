import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToS3 } from '@/lib/s3';

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
    const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(fileNameLower);
    const isDoc = mimeType === 'application/pdf' || mimeType === 'text/plain' || /\.(pdf|txt)$/i.test(fileNameLower);
    if (!isImage && !isDoc) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an image or PDF/TXT.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let uploadResult;
    try {
      uploadResult = await uploadToS3(
        buffer,
        file.name || 'attachment',
        `report-attachments/${session.user.id}`,
        mimeType || 'application/octet-stream'
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
