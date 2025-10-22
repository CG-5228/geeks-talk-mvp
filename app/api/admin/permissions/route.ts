import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSuperAdmin, getAllAdmins, createAdminPermission, revokeAdminPermission } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const isSuper = await isSuperAdmin(session.user.email || '');
  if (!isSuper) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const admins = await getAllAdmins();
  return NextResponse.json(admins);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const isSuper = await isSuperAdmin(session.user.email || '');
  if (!isSuper) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  
  // Find user by email
  const user = await db.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  // Check if user is already an admin
  const existingPermission = await db.adminPermission.findUnique({
    where: { userId: user.id }
  });
  
  if (existingPermission) {
    return NextResponse.json({ error: 'User is already an admin' }, { status: 400 });
  }
  
  const hash = await createAdminPermission(user.id, session.user.id);
  
  return NextResponse.json({ 
    message: 'Admin permission granted',
    adminHash: hash,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const isSuper = await isSuperAdmin(session.user.email || '');
  if (!isSuper) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  // Prevent removing super admin
  const user = await db.user.findUnique({
    where: { id: userId }
  });
  
  if (user?.email === process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot remove super admin' }, { status: 400 });
  }
  
  await revokeAdminPermission(userId);
  
  return NextResponse.json({ message: 'Admin permission revoked' });
}
