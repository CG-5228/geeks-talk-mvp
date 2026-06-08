import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminGate';
import { logAdminAction } from '@/lib/adminAudit';
import {
  defaultOrderField,
  getModel,
  isScalarField,
  isWritable,
  safeSelect,
  searchableStringFields,
  serializeBigInt,
} from '@/lib/dbAdminServer';

const MAX_LIMIT = 200;

type PrismaDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  count: (args?: unknown) => Promise<number>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

export async function GET(req: Request, props: { params: Promise<{ table: string }> }) {
  const params = await props.params;
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { table } = params;
  const model = getModel(table) as PrismaDelegate | null;
  if (!model) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));
  const skip = (page - 1) * limit;

  const q = (searchParams.get('q') || '').trim();
  const orderByRaw = searchParams.get('orderBy') || '';
  const orderDirRaw = (searchParams.get('orderDir') || 'desc').toLowerCase();
  const orderDir: 'asc' | 'desc' = orderDirRaw === 'asc' ? 'asc' : 'desc';

  const orderField =
    orderByRaw && isScalarField(table, orderByRaw) ? orderByRaw : defaultOrderField(table);

  const where: Record<string, unknown> = {};
  if (q) {
    const fields = searchableStringFields(table);
    if (fields.length > 0) {
      where.OR = fields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
    }
  }

  try {
    const [records, total] = await Promise.all([
      model.findMany({
        where: Object.keys(where).length ? where : undefined,
        select: safeSelect(table),
        skip,
        take: limit,
        orderBy: { [orderField]: orderDir },
      }),
      model.count(Object.keys(where).length ? { where } : undefined),
    ]);

    return NextResponse.json({
      records: serializeBigInt(records),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      order: { field: orderField, dir: orderDir },
      search: { q, fields: q ? searchableStringFields(table) : [] },
      writable: isWritable(table),
    });
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch data',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ table: string }> }) {
  const params = await props.params;
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { table } = params;
  if (!isWritable(table)) {
    return NextResponse.json(
      { error: `Deletion not allowed on ${table}` },
      { status: 403 },
    );
  }

  const model = getModel(table) as PrismaDelegate | null;
  if (!model) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  let body: { id?: unknown; ids?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === 'string')
    : typeof body.id === 'string'
      ? [body.id]
      : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
  }

  try {
    const results = await Promise.allSettled(
      ids.map((id) => model.delete({ where: { id } })),
    );

    const deleted = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - deleted;

    await logAdminAction({
      adminId: gate.userId,
      action: 'db.delete',
      targetType: table,
      targetId: ids.length === 1 ? ids[0] : undefined,
      summary: `Deleted ${deleted}/${ids.length} row${ids.length === 1 ? '' : 's'} from ${table}`,
      metadata: { table, ids, deleted, failed },
      req,
    });

    return NextResponse.json({
      deleted,
      failed,
      message:
        failed === 0
          ? `Deleted ${deleted} record${deleted === 1 ? '' : 's'}`
          : `Deleted ${deleted}, failed ${failed}`,
    });
  } catch (error) {
    console.error('Database delete error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete record',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
