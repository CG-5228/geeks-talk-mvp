import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { db } from './db';
import { getPresignedUrl } from './s3';
import type { AdminFileRecord, FileCategory, FileSource } from './filesAdmin';
import { categorizeFile } from './filesAdmin';

export const S3_BUCKET = process.env.AWS_S3_BUCKET || 'geekstalk-uploads-dev';
export const S3_REGION = process.env.AWS_REGION || 'us-east-1';

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface S3ObjectMeta {
  contentLength: number | null;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
  storageClass: string | null;
  serverSideEncryption: string | null;
  exists: boolean;
}

export async function getS3ObjectMeta(key: string): Promise<S3ObjectMeta> {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return {
      contentLength: res.ContentLength ?? null,
      contentType: res.ContentType ?? null,
      etag: res.ETag ? res.ETag.replace(/"/g, '') : null,
      lastModified: res.LastModified ? res.LastModified.toISOString() : null,
      storageClass: res.StorageClass ?? 'STANDARD',
      serverSideEncryption: res.ServerSideEncryption ?? null,
      exists: true,
    };
  } catch {
    return {
      contentLength: null,
      contentType: null,
      etag: null,
      lastModified: null,
      storageClass: null,
      serverSideEncryption: null,
      exists: false,
    };
  }
}

export function getS3PublicUrl(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodeURI(key)}`;
}

export async function getDownloadUrl(
  key: string,
  fileName: string,
  contentType: string,
  inline = false,
): Promise<string> {
  return getPresignedUrl(key, 60 * 60, { inline, contentType, fileName });
}

interface QueryArgs {
  q: string;
  source: 'all' | FileSource;
  category: 'all' | FileCategory;
  orderBy: 'createdAt' | 'fileName' | 'fileSize' | 'fileType';
  orderDir: 'asc' | 'desc';
  page: number;
  limit: number;
}

type PrismaFileWhere = {
  OR?: Array<Record<string, unknown>>;
};

function buildSearchWhere(q: string, extraStringFields: string[]): PrismaFileWhere | undefined {
  if (!q.trim()) return undefined;
  const needle = q.trim();
  const clauses: Array<Record<string, unknown>> = extraStringFields.map((f) => ({
    [f]: { contains: needle, mode: 'insensitive' },
  }));
  clauses.push({ uploader: { name: { contains: needle, mode: 'insensitive' } } });
  clauses.push({ uploader: { username: { contains: needle, mode: 'insensitive' } } });
  clauses.push({ uploader: { email: { contains: needle, mode: 'insensitive' } } });
  return { OR: clauses };
}

const UPLOADER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  image: true,
} as const;

/**
 * Unified list query across VoiceGroupFile + ChannelFile.
 *
 * The previous implementation paged each table separately with the same
 * `skip/limit`, then concatenated the two slices — so total paging was
 * broken (page 2 skipped 50+50=100 rows across both, not 50). We instead
 * fetch up to `page*limit` rows from each relevant table, merge, sort,
 * then slice. Fine for our working data volume; revisit with a UNION
 * view if the file count grows into the hundreds of thousands.
 */
export async function fetchUnifiedFiles(args: QueryArgs): Promise<{
  records: AdminFileRecord[];
  total: number;
}> {
  const { q, source, category, orderBy, orderDir, page, limit } = args;

  const voiceWhere = buildSearchWhere(q, ['fileName', 'fileType']);
  const channelWhere = buildSearchWhere(q, ['fileName', 'fileType']);

  const orderArg = { [orderBy]: orderDir } as const;
  const fetchSize = Math.min(2000, page * limit);

  const includeVoice = source === 'all' || source === 'voice';
  const includeChannel = source === 'all' || source === 'channel';

  const [voiceRows, channelRows, voiceTotal, channelTotal] = await Promise.all([
    includeVoice
      ? db.voiceGroupFile.findMany({
          where: voiceWhere,
          include: {
            uploader: { select: UPLOADER_SELECT },
            group: {
              select: {
                id: true,
                groupNumber: true,
                channel: { select: { id: true, name: true, slug: true } },
              },
            },
          },
          orderBy: orderArg,
          take: fetchSize,
        })
      : Promise.resolve([]),
    includeChannel
      ? db.channelFile.findMany({
          where: channelWhere,
          include: {
            uploader: { select: UPLOADER_SELECT },
            channel: { select: { id: true, name: true, slug: true } },
          },
          orderBy: orderArg,
          take: fetchSize,
        })
      : Promise.resolve([]),
    includeVoice ? db.voiceGroupFile.count({ where: voiceWhere }) : Promise.resolve(0),
    includeChannel ? db.channelFile.count({ where: channelWhere }) : Promise.resolve(0),
  ]);

  const voiceMapped: AdminFileRecord[] = voiceRows.map((f) => ({
    id: f.id,
    source: 'voice',
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    s3Key: f.s3Key,
    createdAt: f.createdAt.toISOString(),
    uploader: f.uploader,
    channel: f.group?.channel ?? null,
    groupNumber: f.group?.groupNumber ?? null,
  }));

  const channelMapped: AdminFileRecord[] = channelRows.map((f) => ({
    id: f.id,
    source: 'channel',
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    s3Key: f.s3Key,
    createdAt: f.createdAt.toISOString(),
    uploader: f.uploader,
    channel: f.channel ?? null,
    groupNumber: null,
  }));

  let combined = [...voiceMapped, ...channelMapped];

  if (category !== 'all') {
    combined = combined.filter((f) => categorizeFile(f.fileType, f.fileName) === category);
  }

  combined.sort((a, b) => {
    const av = a[orderBy];
    const bv = b[orderBy];
    if (typeof av === 'number' && typeof bv === 'number') {
      return orderDir === 'asc' ? av - bv : bv - av;
    }
    const as = String(av ?? '');
    const bs = String(bv ?? '');
    return orderDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
  });

  const total = voiceTotal + channelTotal;
  const start = (page - 1) * limit;
  const slice = combined.slice(start, start + limit);

  return { records: slice, total };
}

export async function findFileById(
  source: FileSource,
  id: string,
): Promise<AdminFileRecord | null> {
  if (source === 'voice') {
    const f = await db.voiceGroupFile.findUnique({
      where: { id },
      include: {
        uploader: { select: UPLOADER_SELECT },
        group: {
          select: {
            id: true,
            groupNumber: true,
            channel: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!f) return null;
    return {
      id: f.id,
      source: 'voice',
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      s3Key: f.s3Key,
      createdAt: f.createdAt.toISOString(),
      uploader: f.uploader,
      channel: f.group?.channel ?? null,
      groupNumber: f.group?.groupNumber ?? null,
    };
  }

  const f = await db.channelFile.findUnique({
    where: { id },
    include: {
      uploader: { select: UPLOADER_SELECT },
      channel: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!f) return null;
  return {
    id: f.id,
    source: 'channel',
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    s3Key: f.s3Key,
    createdAt: f.createdAt.toISOString(),
    uploader: f.uploader,
    channel: f.channel ?? null,
    groupNumber: null,
  };
}

export async function deleteFileById(source: FileSource, id: string): Promise<boolean> {
  if (source === 'voice') {
    await db.voiceGroupFile.delete({ where: { id } });
  } else {
    await db.channelFile.delete({ where: { id } });
  }
  return true;
}

export async function getFileStats(): Promise<{
  counts: { total: number; voice: number; channel: number };
  size: { total: number; byCategory: Record<FileCategory, number> };
}> {
  const [voiceRows, channelRows] = await Promise.all([
    db.voiceGroupFile.findMany({ select: { fileType: true, fileName: true, fileSize: true } }),
    db.channelFile.findMany({ select: { fileType: true, fileName: true, fileSize: true } }),
  ]);

  const byCategory: Record<FileCategory, number> = {
    image: 0,
    video: 0,
    audio: 0,
    document: 0,
    spreadsheet: 0,
    archive: 0,
    code: 0,
    other: 0,
  };
  let total = 0;

  for (const f of [...voiceRows, ...channelRows]) {
    const cat = categorizeFile(f.fileType, f.fileName);
    byCategory[cat] += f.fileSize;
    total += f.fileSize;
  }

  return {
    counts: {
      voice: voiceRows.length,
      channel: channelRows.length,
      total: voiceRows.length + channelRows.length,
    },
    size: { total, byCategory },
  };
}
