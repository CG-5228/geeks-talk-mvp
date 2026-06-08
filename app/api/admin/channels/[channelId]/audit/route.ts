import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGate';
import { fetchChannelAudit } from '@/lib/channelAdminServer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));

  try {
    const rows = await fetchChannelAudit(params.channelId, limit);
    return NextResponse.json({ channelId: params.channelId, events: rows });
  } catch (error) {
    console.error('Channel audit error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch audit log',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
