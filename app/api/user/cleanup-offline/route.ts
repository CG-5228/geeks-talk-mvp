import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    // Mark users as offline if they haven't been active for more than 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

    const result = await db.user.updateMany({
      where: {
        onlineStatus: 'online',
        lastSeen: {
          lt: tenSecondsAgo
        }
      },
      data: {
        onlineStatus: 'offline'
      }
    });

    if (result.count > 0) {
      console.log('🧹 Cleanup: Set', result.count, 'users offline (10s threshold)');
    }

    return NextResponse.json({
      success: true,
      usersSetOffline: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🧹 Failed to cleanup offline users:', error);
    return NextResponse.json({ error: 'Failed to cleanup offline users' }, { status: 500 });
  }
}

// Allow GET for testing
export async function GET() {
  return POST(new Request('http://localhost', { method: 'POST' }));
}
