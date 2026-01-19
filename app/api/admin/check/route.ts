import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isSuperAdmin, getAdminHash, createAdminPermission } from '@/lib/admin';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if user is superAdmin
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true }
  });
  const isSuper = await isSuperAdmin(user?.email || '');

  // Get admin hash from AdminPermission table
  let adminPermission = await db.adminPermission.findFirst({
    where: { userId: session.user.id },
    select: { adminHash: true }
  });

  let adminHash = adminPermission?.adminHash || null;

  // If superAdmin doesn't have an adminHash, create one
  if (isSuper && !adminHash) {
    adminHash = await createAdminPermission(session.user.id);
  }

  return NextResponse.json({ 
    isAdmin: true,
    isSuperAdmin: isSuper,
    userId: session.user.id,
    adminHash
  });
}