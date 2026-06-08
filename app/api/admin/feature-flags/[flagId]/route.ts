import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAdminAction } from '@/lib/adminAudit';
import { invalidateFeatureFlag } from '@/lib/featureFlags';
import { requireSuperAdmin } from '@/lib/adminGate';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;
  const { flagId } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const existing = await db.featureFlag.findUnique({ where: { id: flagId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data: Record<string, unknown> = { updatedBy: gate.userId };

  if ('label' in body) {
    data.label = typeof body.label === 'string' ? body.label.slice(0, 200) : null;
  }
  if ('description' in body) {
    data.description =
      typeof body.description === 'string' ? body.description.slice(0, 1000) : null;
  }
  if ('enabled' in body) {
    data.enabled = Boolean(body.enabled);
  }
  if ('rollout' in body) {
    const r = Math.min(100, Math.max(0, Math.round(Number(body.rollout))));
    if (Number.isNaN(r)) {
      return NextResponse.json({ error: 'Invalid rollout' }, { status: 400 });
    }
    data.rollout = r;
  }
  if ('audience' in body) {
    data.audience = typeof body.audience === 'string' ? body.audience.slice(0, 60) : null;
  }

  const flag = await db.featureFlag.update({
    where: { id: flagId },
    data,
  });

  invalidateFeatureFlag(flag.key);

  const toggled = 'enabled' in body && existing.enabled !== flag.enabled;
  await logAdminAction({
    adminId: gate.userId,
    action: toggled ? 'flag.toggle' : 'flag.update',
    targetType: 'featureFlag',
    targetId: flag.id,
    summary: toggled
      ? `${flag.enabled ? 'Enabled' : 'Disabled'} flag "${flag.key}"`
      : `Updated flag "${flag.key}"`,
    metadata: {
      key: flag.key,
      before: {
        enabled: existing.enabled,
        rollout: existing.rollout,
        audience: existing.audience,
      },
      after: { enabled: flag.enabled, rollout: flag.rollout, audience: flag.audience },
    },
    req,
  });

  return NextResponse.json({ flag });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;
  const { flagId } = await params;

  const existing = await db.featureFlag.findUnique({ where: { id: flagId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.featureFlag.delete({ where: { id: flagId } });
  invalidateFeatureFlag(existing.key);

  await logAdminAction({
    adminId: gate.userId,
    action: 'flag.delete',
    targetType: 'featureFlag',
    targetId: flagId,
    summary: `Deleted flag "${existing.key}"`,
    metadata: { key: existing.key },
    req,
  });

  return NextResponse.json({ ok: true });
}
