import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminGate';
import { logAdminAction } from '@/lib/adminAudit';
import { deleteFromS3 } from '@/lib/s3';
import {
  deleteFileById,
  fetchUnifiedFiles,
  findFileById,
} from '@/lib/filesAdminServer';
import type { FileCategory, FileSource } from '@/lib/filesAdmin';

const MAX_LIMIT = 200;
const VALID_SOURCES = new Set<FileSource | 'all'>(['all', 'voice', 'channel']);
const VALID_CATEGORIES = new Set<FileCategory | 'all'>([
  'all',
  'image',
  'video',
  'audio',
  'document',
  'spreadsheet',
  'archive',
  'code',
  'other',
]);
const VALID_ORDER = new Set(['createdAt', 'fileName', 'fileSize', 'fileType']);

export async function GET(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));

  const sourceRaw = (searchParams.get('source') || 'all') as FileSource | 'all';
  const categoryRaw = (searchParams.get('category') || 'all') as FileCategory | 'all';
  const orderByRaw = searchParams.get('orderBy') || 'createdAt';
  const orderDirRaw = (searchParams.get('orderDir') || 'desc').toLowerCase();

  const source = VALID_SOURCES.has(sourceRaw) ? sourceRaw : 'all';
  const category = VALID_CATEGORIES.has(categoryRaw) ? categoryRaw : 'all';
  const orderBy = (VALID_ORDER.has(orderByRaw) ? orderByRaw : 'createdAt') as
    | 'createdAt'
    | 'fileName'
    | 'fileSize'
    | 'fileType';
  const orderDir: 'asc' | 'desc' = orderDirRaw === 'asc' ? 'asc' : 'desc';

  const q = (searchParams.get('q') || '').trim();

  try {
    const { records, total } = await fetchUnifiedFiles({
      q,
      source,
      category,
      orderBy,
      orderDir,
      page,
      limit,
    });

    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: { q, source, category },
      order: { field: orderBy, dir: orderDir },
    });
  } catch (error) {
    console.error('Files list error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch files',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

interface DeleteTarget {
  id: string;
  source: FileSource;
}

export async function DELETE(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  let body: { fileId?: unknown; id?: unknown; source?: unknown; targets?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const targets: DeleteTarget[] = [];
  if (Array.isArray(body.targets)) {
    for (const t of body.targets) {
      if (
        t &&
        typeof t === 'object' &&
        typeof (t as { id?: unknown }).id === 'string' &&
        ((t as { source?: unknown }).source === 'voice' ||
          (t as { source?: unknown }).source === 'channel')
      ) {
        targets.push({
          id: (t as { id: string }).id,
          source: (t as { source: FileSource }).source,
        });
      }
    }
  } else if (typeof body.id === 'string' && (body.source === 'voice' || body.source === 'channel')) {
    targets.push({ id: body.id, source: body.source });
  } else if (typeof body.fileId === 'string') {
    // Back-compat: legacy callers pass { fileId } and we probe both sources.
    const id = body.fileId;
    const voice = await findFileById('voice', id);
    if (voice) targets.push({ id, source: 'voice' });
    else {
      const ch = await findFileById('channel', id);
      if (ch) targets.push({ id, source: 'channel' });
    }
  }

  if (targets.length === 0) {
    return NextResponse.json({ error: 'No valid delete targets' }, { status: 400 });
  }

  const results = await Promise.allSettled(
    targets.map(async (t) => {
      const record = await findFileById(t.source, t.id);
      if (!record) throw new Error('File not found');
      try {
        await deleteFromS3(record.s3Key);
      } catch (err) {
        console.error('S3 delete failed (continuing with DB delete):', record.s3Key, err);
      }
      await deleteFileById(t.source, t.id);
      return { id: t.id, source: t.source, s3Key: record.s3Key };
    }),
  );

  const deleted = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - deleted;

  await logAdminAction({
    adminId: gate.userId,
    action: 'file.delete',
    targetType: 'file',
    targetId: targets.length === 1 ? targets[0]!.id : undefined,
    summary: `Deleted ${deleted}/${targets.length} file${targets.length === 1 ? '' : 's'}`,
    metadata: {
      targets,
      deleted,
      failed,
      keys: results
        .filter((r): r is PromiseFulfilledResult<{ id: string; source: FileSource; s3Key: string }> =>
          r.status === 'fulfilled',
        )
        .map((r) => r.value.s3Key),
    },
    req,
  });

  return NextResponse.json({
    deleted,
    failed,
    message:
      failed === 0
        ? `Deleted ${deleted} file${deleted === 1 ? '' : 's'}`
        : `Deleted ${deleted}, failed ${failed}`,
  });
}
