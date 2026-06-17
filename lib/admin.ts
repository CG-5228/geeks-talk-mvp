import { db } from './db';
import crypto from 'crypto';

export type AdminRole = 'super-admin' | 'moderator';

export async function isSuperAdmin(email: string): Promise<boolean> {
  const configured = process.env.SUPER_ADMIN_EMAIL;
  if (!configured) return false;
  return email.toLowerCase() === configured.toLowerCase();
}

/**
 * Guarantees the super admin (as defined by SUPER_ADMIN_EMAIL) has an
 * AdminPermission row and that its role is 'super-admin'. Idempotent.
 * Returns true if the user is the super admin, false otherwise.
 */
export async function ensureSuperAdminPermission(userId: string, email: string): Promise<boolean> {
  if (!(await isSuperAdmin(email))) return false;
  const existing = await db.adminPermission.findUnique({ where: { userId } });
  if (existing) {
    if (existing.role !== 'super-admin') {
      await db.adminPermission.update({
        where: { userId },
        data: { role: 'super-admin' },
      });
    }
    return true;
  }
  try {
    await createAdminPermission(userId, undefined, 'super-admin');
  } catch (err: any) {
    // Another concurrent request may have just created it — ignore unique constraint races.
    if (err?.code !== 'P2002') throw err;
  }
  return true;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const permission = await db.adminPermission.findUnique({
    where: { userId }
  });
  if (permission) return true;

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return false;

  // Super admin: self-heal the AdminPermission row if missing so audit
  // logs, admin lists, and hash-based routes work consistently.
  if (await isSuperAdmin(user.email)) {
    await ensureSuperAdminPermission(userId, user.email);
    return true;
  }
  return false;
}

/**
 * Returns the admin's role, or null if they aren't an admin.
 * Super admin (by env) is always reported as 'super-admin' regardless of DB drift.
 */
export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  const permission = await db.adminPermission.findUnique({
    where: { userId },
    select: { role: true, user: { select: { email: true } } },
  });
  if (!permission) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email && (await isSuperAdmin(user.email))) {
      await ensureSuperAdminPermission(userId, user.email);
      return 'super-admin';
    }
    return null;
  }
  if (permission.user?.email && (await isSuperAdmin(permission.user.email))) {
    return 'super-admin';
  }
  return permission.role === 'super-admin' ? 'super-admin' : 'moderator';
}

export async function isSuperAdminUser(userId: string): Promise<boolean> {
  return (await getAdminRole(userId)) === 'super-admin';
}

export async function getAdminHash(userId: string): Promise<string | null> {
  const permission = await db.adminPermission.findUnique({
    where: { userId }
  });
  return permission?.adminHash || null;
}

export async function generateAdminHash(userId: string): Promise<string> {
  void userId;
  return crypto.randomBytes(16).toString('hex');
}

export async function validateAdminHash(hash: string): Promise<string | null> {
  const permission = await db.adminPermission.findUnique({
    where: { adminHash: hash }
  });
  return permission?.userId || null;
}

export async function createAdminPermission(
  userId: string,
  grantedBy?: string,
  role: AdminRole = 'moderator',
): Promise<string> {
  const hash = await generateAdminHash(userId);

  await db.adminPermission.create({
    data: {
      userId,
      adminHash: hash,
      role,
      grantedBy,
    },
  });

  return hash;
}

export async function revokeAdminPermission(userId: string): Promise<void> {
  await db.adminPermission.delete({
    where: { userId }
  });
}

export async function getAllAdmins() {
  return await db.adminPermission.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      },
      grantedByUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export async function setAdminRole(userId: string, role: AdminRole): Promise<void> {
  await db.adminPermission.update({
    where: { userId },
    data: { role },
  });
}
