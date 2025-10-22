import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🚪 Logout API: Setting user offline:', (session.user as any).id);

    // Update user's lastSeen and set offline when they logout
    const result = await db.user.update({
      where: { id: (session.user as any).id },
      data: {
        lastSeen: new Date(),
        onlineStatus: 'offline'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User status updated on logout',
      userId: (session.user as any).id
    });
  } catch (error) {
    console.error('🚪 Logout API: Failed to update user status on logout:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
