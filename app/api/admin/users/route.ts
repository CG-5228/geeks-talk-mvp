import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';
  
  const skip = (page - 1) * limit;
  
  // Build where clause for search
  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
      { username: { contains: search, mode: 'insensitive' as const } }
    ]
  } : {};
  
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        onlineStatus: true,
        lastSeen: true,
        createdAt: true,
        likesCount: true,
        _count: {
          select: {
            messages: true,
            reportsReceived: true,
            voteKickPolls: true
          }
        },
        activity: {
          select: {
            totalMessages: true,
            voiceMinutes: true,
            totalOnlineTime: true,
            lastActive: true
          }
        },
        bans: {
          where: {
            expiresAt: {
              gt: new Date()
            }
          },
          select: {
            id: true,
            reason: true,
            expiresAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.user.count({ where })
  ]);

  // Enhance users with better online status determination
  const enhancedUsers = users.map(user => {
    const now = new Date();
    const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null;
    const secondsSinceLastSeen = lastSeen ? Math.floor((now.getTime() - lastSeen.getTime()) / 1000) : Infinity;
    
    // Consider user online if:
    // 1. onlineStatus is 'online' AND lastSeen is within 15 seconds, OR
    // 2. lastSeen is within 10 seconds (regardless of onlineStatus)
    const isActuallyOnline = (
      (user.onlineStatus === 'online' && secondsSinceLastSeen <= 15) ||
      secondsSinceLastSeen <= 10
    );

    // Debug logging for online status determination
    if (user.email === 'g15222152017@gmail.com' || user.email === 'u6030799340@gmail.com') {
      console.log('🔍 Admin API - User status check:', {
        name: user.name,
        email: user.email,
        originalOnlineStatus: user.onlineStatus,
        lastSeen: user.lastSeen?.toISOString(),
        secondsSinceLastSeen,
        isActuallyOnline,
        finalStatus: isActuallyOnline ? 'online' : 'offline'
      });
    }

    return {
      ...user,
      onlineStatus: isActuallyOnline ? 'online' : 'offline',
      secondsSinceLastSeen
    };
  });
  
  return NextResponse.json({
    users: enhancedUsers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { userId, email } = await req.json();
  if (!userId || !email) {
    return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 });
  }
  
  const user = await db.user.update({
    where: { id: userId },
    data: { email },
    select: {
      id: true,
      name: true,
      email: true,
      username: true
    }
  });
  
  return NextResponse.json({ message: 'User updated', user });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  // Prevent deleting super admin
  const user = await db.user.findUnique({
    where: { id: userId }
  });
  
  if (user?.email === process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot delete super admin' }, { status: 400 });
  }
  
  // Delete user (cascade will handle related records)
  await db.user.delete({
    where: { id: userId }
  });
  
  return NextResponse.json({ message: 'User deleted' });
}
