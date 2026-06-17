import {
  getAllAdmins,
  createAdminPermission,
  revokeAdminPermission,
  setAdminRole,
  type AdminRole,
} from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAdminAction } from '@/lib/adminAudit';
import { requireSuperAdmin } from '@/lib/adminGate';

export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const admins = await getAllAdmins();
  return NextResponse.json(admins);
}

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { email, role } = (await req.json()) as { email?: string; role?: string };
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  const desiredRole: AdminRole = role === 'super-admin' ? 'super-admin' : 'moderator';

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const existingPermission = await db.adminPermission.findUnique({
    where: { userId: user.id },
  });
  if (existingPermission) {
    return NextResponse.json({ error: 'User is already an admin' }, { status: 400 });
  }

  const hash = await createAdminPermission(user.id, gate.userId, desiredRole);

  await logAdminAction({
    adminId: gate.userId,
    action: 'admin.grant',
    targetType: 'user',
    targetId: user.id,
    summary: `${user.email ?? user.id} (${desiredRole})`,
    metadata: { grantedEmail: user.email, grantedName: user.name, role: desiredRole },
    req,
  });

  return NextResponse.json({
    message: 'Admin permission granted',
    adminHash: hash,
    role: desiredRole,
    user: { id: user.id, name: user.name, email: user.email },
  });
}

export async function PATCH(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { userId, role } = (await req.json()) as { userId?: string; role?: string };
  if (!userId || (role !== 'super-admin' && role !== 'moderator')) {
    return NextResponse.json({ error: 'userId and valid role required' }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Protect the env-configured super admin from being demoted.
  if (
    role === 'moderator' &&
    target.email &&
    process.env.SUPER_ADMIN_EMAIL &&
    target.email.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    return NextResponse.json(
      { error: 'Cannot demote the env-configured super admin' },
      { status: 400 },
    );
  }

  await setAdminRole(userId, role);

  await logAdminAction({
    adminId: gate.userId,
    action: 'admin.update',
    targetType: 'user',
    targetId: userId,
    summary: `Set role of ${target.email ?? userId} to ${role}`,
    metadata: { role, email: target.email },
    req,
  });

  return NextResponse.json({ message: 'Role updated', role });
}

export async function DELETE(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { userId } = (await req.json()) as { userId?: string };
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.email === process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot remove super admin' }, { status: 400 });
  }

  await revokeAdminPermission(userId);

  await logAdminAction({
    adminId: gate.userId,
    action: 'admin.revoke',
    targetType: 'user',
    targetId: userId,
    summary: user?.email ?? undefined,
    metadata: { revokedEmail: user?.email, revokedName: user?.name },
    req,
  });

  return NextResponse.json({ message: 'Admin permission revoked' });
}
