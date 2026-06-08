import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGate';
import { fetchChannelFiles } from '@/lib/channelAdminServer';

export const dynamic = 'force-dynamic';

const VALID_ORDER = new Set(['createdAt', 'fileName', 'fileSize']);

export async function GET(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const orderByRaw = searchParams.get('orderBy') || 'createdAt';
  const orderDirRaw = (searchParams.get('orderDir') || 'desc').toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Math.min(200, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));

  try {
    const { rows, total } = await fetchChannelFiles({
      channelId: params.channelId,
      q,
      orderBy: (VALID_ORDER.has(orderByRaw) ? orderByRaw : 'createdAt') as
        | 'createdAt'
        | 'fileName'
        | 'fileSize',
      orderDir: orderDirRaw === 'asc' ? 'asc' : 'desc',
      page,
      limit,
    });

    return NextResponse.json({
      channelId: params.channelId,
      files: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Channel files error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch files',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
