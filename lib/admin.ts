import { db } from './db';
import crypto from 'crypto';

export async function isSuperAdmin(email: string): Promise<boolean> {
  return email === process.env.SUPER_ADMIN_EMAIL;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const permission = await db.adminPermission.findUnique({
    where: { userId }
  });
  return !!permission || await isSuperAdmin((await db.user.findUnique({ where: { id: userId } }))?.email || '');
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

export async function createAdminPermission(userId: string, grantedBy?: string): Promise<string> {
  const hash = await generateAdminHash(userId);
  
  await db.adminPermission.create({
    data: {
      userId,
      adminHash: hash,
      grantedBy
    }
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
