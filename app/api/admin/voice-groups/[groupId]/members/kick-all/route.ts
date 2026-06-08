import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGate';
import { logAdminAction } from '@/lib/adminAudit';

export async function POST(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const group = await db.voiceGroup.findUnique({
    where: { id: params.groupId },
    select: { id: true, groupNumber: true, channel: { select: { name: true } } },
  });
  if (!group) {
    return NextResponse.json({ error: 'Voice group not found' }, { status: 404 });
  }

  const result = await db.voiceGroupMember.deleteMany({
    where: { groupId: params.groupId },
  });

  await logAdminAction({
    adminId: gate.userId,
    action: 'voicegroup.kick_all',
    targetType: 'voice_group',
    targetId: params.groupId,
    summary: `Kicked ${result.count} members from ${group.channel.name} · Group ${group.groupNumber}`,
    metadata: { removed: result.count },
    req,
  });

  return NextResponse.json({ removed: result.count });
}
