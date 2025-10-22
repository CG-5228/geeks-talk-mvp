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
  const type = searchParams.get('type');
  const read = searchParams.get('read');
  
  const skip = (page - 1) * limit;
  
  // Scope to this admin only
  const where: any = { userId: session.user.id };
  if (type) where.type = type;
  if (read !== null) where.read = read === 'true';
  
  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId: session.user.id, read: false } })
  ]);
  
  // Get stats by type (for this admin only)
  const typeStats = await db.notification.groupBy({
    by: ['type'],
    where: { userId: session.user.id },
    _count: { type: true }
  });
  
  const byType = typeStats.reduce((acc, stat) => {
    acc[stat.type] = stat._count.type;
    return acc;
  }, {} as { [key: string]: number });
  
  return NextResponse.json({
    notifications,
    stats: {
      total,
      unread: unreadCount,
      byType
    },
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
  
  const { notificationIds, read } = await req.json();
  
  if (!notificationIds || !Array.isArray(notificationIds)) {
    return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
  }
  
  try {
    await db.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id // ensure only own notifications are updated
      },
      data: { read }
    });
    
    return NextResponse.json({ message: 'Notifications updated successfully' });
  } catch (error) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { userId, type, title, message, metadata } = await req.json();
  
  if (!userId || !type || !title || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  try {
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
