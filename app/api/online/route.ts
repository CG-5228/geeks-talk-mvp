import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';

// Public endpoint: returns current online users count
export async function GET() {
  try {
    // Check if DATABASE_URL is available and not a dummy URL (skip during build)
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dummy')) {
      console.log('🌐 Online API: No valid DATABASE_URL, returning 0 (build time)');
      return NextResponse.json({ online: 0 }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Consider a user online if they've pinged within the last 30 seconds
    const threshold = new Date(Date.now() - 30 * 1000);
    const onlineUsers = await db.user.count({
      where: { lastSeen: { gte: threshold } },
    });

    // Also get the actual users for debugging
    const users = await db.user.findMany({
      where: { lastSeen: { gte: threshold } },
      select: { id: true, name: true, lastSeen: true, onlineStatus: true }
    });

    console.log('🌐 Online API: Found', onlineUsers, 'online users (threshold: 30s)');
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

