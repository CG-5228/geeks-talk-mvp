import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `report-attachments/${session.user.id}/${timestamp}-${randomString}.${fileExtension}`;

    // Debug environment variables
    console.log('🔍 Environment check:');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
    console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);

    // Temporary hardcoded values for testing
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || 'REMOVED_AWS_KEY';
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'REMOVED_AWS_SECRET';
    const awsRegion = process.env.AWS_REGION || 'eu-west-1';
    const awsS3Bucket = process.env.AWS_S3_BUCKET || 'geekstalk-uploads-prod';

    console.log('🔧 Using S3 config:', {
      region: awsRegion,
      bucket: awsS3Bucket,
      accessKeyId: awsAccessKeyId ? 'SET' : 'NOT SET',
      secretAccessKey: awsSecretAccessKey ? 'SET' : 'NOT SET'
    });

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('📤 Uploading file to S3:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bufferLength: buffer.length
    });
    
    let s3Result;
    try {
      // Create S3 client with hardcoded values for testing
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const { v4: uuidv4 } = await import('uuid');
      
      const s3Client = new S3Client({
        region: awsRegion,
        credentials: {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        },
      });

      const key = `report-attachments/${uuidv4()}-${file.name}`;
      
      const command = new PutObjectCommand({
        Bucket: awsS3Bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      });

      await s3Client.send(command);
      console.log('✅ S3 upload successful:', { key });

      // Generate presigned URL for 7 days
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: awsS3Bucket,
          Key: key,
        }),
        { expiresIn: 7 * 24 * 60 * 60 } // 7 days
      );

      s3Result = { key, url };
      console.log('✅ S3 presigned URL generated:', { url });
    } catch (s3Error) {
      console.error('❌ S3 upload failed:', s3Error);
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
        s3Key: s3Result.key,
        s3Url: s3Result.url
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
