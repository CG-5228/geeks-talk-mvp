import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    let userId: string;

    // Handle both JSON and FormData (from sendBeacon)
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await req.json();
      userId = body.userId;
    } else {
      // Handle FormData from sendBeacon
      const formData = await req.formData();
      userId = formData.get('userId') as string;
    }

    if (!userId) {

      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Directly update the user's status without session check
    const result = await db.user.update({
      where: { id: userId },
      data: {
        lastSeen: new Date(Date.now() - 2 * 60 * 1000), // Set to 2 minutes ago
        onlineStatus: 'offline'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User set offline directly',
      userId: result.id
    });
  } catch (error) {
    console.error('🚪 Direct offline API: Failed to set user offline:', error);
    return NextResponse.json({ error: 'Failed to set offline' }, { status: 500 });
  }
}
