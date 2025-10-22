import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Clean up offline users (set lastSeen to null for users offline for more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const result = await db.user.updateMany({
      where: {
        lastSeen: {
          lt: fiveMinutesAgo,
          not: null
        }
      },
      data: {
        lastSeen: null
      }
    });

    return NextResponse.json({ 
      message: 'Offline users cleaned up successfully',
      updatedCount: result.count
    });
  } catch (error) {
    console.error('Failed to cleanup offline users:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup offline users' },
      { status: 500 }
    );
  }
}