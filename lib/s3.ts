import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'geekstalk-uploads-dev';

export interface UploadResult {
  key: string;
  url: string;
  expiresAt: Date;
}

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  folder: string,
  contentType?: string
): Promise<UploadResult> {
  const key = `${folder}/${uuidv4()}-${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType || 'application/octet-stream',
  });

  await s3Client.send(command);

  // Generate presigned URL for 7 days
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: 7 * 24 * 60 * 60 } // 7 days
  );

  return {
    key,
    url,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export async function getPresignedUrl(key: string, expiresIn: number = 7 * 24 * 60 * 60): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export function getS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Remove the first empty part and bucket name
    return pathParts.slice(2).join('/');
  } catch {
    return null;
  }
}
