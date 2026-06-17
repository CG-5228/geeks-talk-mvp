import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGate';
import { fetchChannelOverview } from '@/lib/channelAdminServer';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const overview = await fetchChannelOverview(params.channelId);
    if (!overview) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
    return NextResponse.json(overview);
  } catch (error) {
    console.error('Channel overview error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch overview',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
