import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminGate';
import {
  S3_BUCKET,
  S3_REGION,
  findFileById,
  getDownloadUrl,
  getS3ObjectMeta,
  getS3PublicUrl,
} from '@/lib/filesAdminServer';
import type { FileSource } from '@/lib/filesAdmin';

function isSource(v: string): v is FileSource {
  return v === 'voice' || v === 'channel';
}

export async function GET(
  req: Request,
  props: { params: Promise<{ source: string; id: string }> },
) {
  const params = await props.params;
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  if (!isSource(params.source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  }

  const record = await findFileById(params.source, params.id);
  if (!record) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const inline = searchParams.get('inline') === '1';

  const [meta, signedUrl] = await Promise.all([
    getS3ObjectMeta(record.s3Key),
    getDownloadUrl(record.s3Key, record.fileName, record.fileType, inline),
  ]);

  return NextResponse.json({
    record,
    s3: {
      bucket: S3_BUCKET,
      region: S3_REGION,
      key: record.s3Key,
      publicUrl: getS3PublicUrl(record.s3Key),
      signedUrl,
      signedUrlExpiresIn: 60 * 60,
      metadata: meta,
    },
  });
}
