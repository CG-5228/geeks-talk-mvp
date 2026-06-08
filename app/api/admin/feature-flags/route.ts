import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAdminAction } from '@/lib/adminAudit';
import { invalidateFeatureFlag } from '@/lib/featureFlags';
import { requireAdmin, requireSuperAdmin } from '@/lib/adminGate';

export const dynamic = 'force-dynamic';

const KEY_REGEX = /^[a-z0-9][a-z0-9-_.]{1,60}$/;

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const flags = await db.featureFlag.findMany({ orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ flags });
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { key, label, description, enabled, rollout, audience } = body as {
    key?: unknown;
    label?: unknown;
    description?: unknown;
    enabled?: unknown;
    rollout?: unknown;
    audience?: unknown;
  };

  if (typeof key !== 'string' || !KEY_REGEX.test(key)) {
    return NextResponse.json({ error: 'Invalid key (2-60 chars: a-z, 0-9, -_.)' }, { status: 400 });
  }

  const normalizedRollout = Math.min(100, Math.max(0, Math.round(Number(rollout ?? 100))));
  if (Number.isNaN(normalizedRollout)) {
    return NextResponse.json({ error: 'Invalid rollout' }, { status: 400 });
  }

  try {
    const flag = await db.featureFlag.create({
      data: {
        key,
        label: typeof label === 'string' ? label.slice(0, 200) : null,
        description: typeof description === 'string' ? description.slice(0, 1000) : null,
        enabled: Boolean(enabled),
        rollout: normalizedRollout,
        audience: typeof audience === 'string' ? audience.slice(0, 60) : null,
        createdBy: gate.userId,
        updatedBy: gate.userId,
      },
    });

    invalidateFeatureFlag(flag.key);
    await logAdminAction({
      adminId: gate.userId,
      action: 'flag.create',
      targetType: 'featureFlag',
      targetId: flag.id,
      summary: `Created flag "${flag.key}" (enabled=${flag.enabled}, rollout=${flag.rollout}%)`,
      metadata: { key: flag.key, enabled: flag.enabled, rollout: flag.rollout },
      req,
    });

    return NextResponse.json({ flag });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Key already exists' }, { status: 409 });
    }
    console.error('Failed to create flag:', err);
    return NextResponse.json({ error: 'Failed to create flag' }, { status: 500 });
  }
}
