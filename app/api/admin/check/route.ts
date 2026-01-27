import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isSuperAdmin } from '@/lib/admin';
import { generateSessionAdminHash } from '@/lib/adminSession';
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

  // Generate a new session-based admin hash each time
  // This hash is temporary and expires after 1 hour
  const adminHash = generateSessionAdminHash(session.user.id);

  return NextResponse.json({ 
    isAdmin: true,
    isSuperAdmin: isSuper,
    userId: session.user.id,
    adminHash
  });
}