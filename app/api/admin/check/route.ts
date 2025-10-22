import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
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

  // Get admin hash from AdminPermission table
  const adminPermission = await db.adminPermission.findFirst({
    where: { userId: session.user.id },
    select: { adminHash: true }
  });

  const adminHash = adminPermission?.adminHash || null;

  return NextResponse.json({ 
    isAdmin: true,
    userId: session.user.id,
    adminHash
  });
}