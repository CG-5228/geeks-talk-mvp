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
    let requestedUserId: string | null = null;

    // Handle both JSON and FormData (from sendBeacon)
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await req.json();
      requestedUserId = typeof body?.userId === 'string' ? body.userId : null;
    } else {
      // Handle FormData from sendBeacon
      const formData = await req.formData();
      const formValue = formData.get('userId');
      requestedUserId = typeof formValue === 'string' ? formValue : null;
    }

    // Never allow clients to mark other users offline.
    if (requestedUserId && requestedUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await db.user.update({
      where: { id: session.user.id },
      data: {
        lastSeen: new Date(Date.now() - 2 * 60 * 1000), // Set to 2 minutes ago
        onlineStatus: 'offline'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User set offline',
      userId: result.id
    });
  } catch (error) {
    console.error('🚪 Direct offline API: Failed to set user offline:', error);
    return NextResponse.json({ error: 'Failed to set offline' }, { status: 500 });
  }
}
