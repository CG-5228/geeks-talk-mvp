import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Public endpoint: returns current online users count
export async function GET() {
  try {
    // Consider a user online if they've pinged within the last 10 seconds
    const threshold = new Date(Date.now() - 10 * 1000);
    const onlineUsers = await db.user.count({
      where: { lastSeen: { gte: threshold } },
    });

    // Also get the actual users for debugging
    const users = await db.user.findMany({
      where: { lastSeen: { gte: threshold } },
      select: { id: true, name: true, lastSeen: true, onlineStatus: true }
    });

    console.log('🌐 Online API: Found', onlineUsers, 'online users (threshold: 10s)');
    console.log('🌐 Online API: Users:', users.map(u => ({
      id: u.id,
      name: u.name,
      lastSeen: u.lastSeen?.toISOString(),
      onlineStatus: u.onlineStatus,
      secondsAgo: Math.round((Date.now() - new Date(u.lastSeen || 0).getTime()) / 1000)
    })));

    return NextResponse.json({ online: onlineUsers }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('🌐 Online API: Error:', e);
    // Fallback to 0 on error to avoid breaking landing page
    return NextResponse.json({ online: 0 }, { status: 200 });
  }
}

