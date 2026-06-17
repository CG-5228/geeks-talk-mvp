import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGate';
import { fetchChannelMembers } from '@/lib/channelAdminServer';

export const dynamic = 'force-dynamic';

const VALID_ORDER = new Set(['name', 'username', 'messages', 'joinedAt']);
const VALID_ROLE = new Set(['all', 'user', 'admin', 'super-admin']);
const VALID_ONLINE = new Set(['all', 'online', 'offline']);

export async function GET(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const roleRaw = searchParams.get('role') || 'all';
  const onlineRaw = searchParams.get('online') || 'all';
  const orderByRaw = searchParams.get('orderBy') || 'name';
  const orderDirRaw = (searchParams.get('orderDir') || 'asc').toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Math.min(200, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));

  try {
    const { rows, total, ownerId } = await fetchChannelMembers({
      channelId: params.channelId,
      q,
      role: (VALID_ROLE.has(roleRaw) ? roleRaw : 'all') as 'all' | 'user' | 'admin' | 'super-admin',
      online: (VALID_ONLINE.has(onlineRaw) ? onlineRaw : 'all') as 'all' | 'online' | 'offline',
      orderBy: (VALID_ORDER.has(orderByRaw) ? orderByRaw : 'name') as
        | 'name'
        | 'username'
        | 'messages'
        | 'joinedAt',
      orderDir: orderDirRaw === 'desc' ? 'desc' : 'asc',
      page,
      limit,
    });

    return NextResponse.json({
      channelId: params.channelId,
      ownerId,
      members: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Channel members fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch members',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
