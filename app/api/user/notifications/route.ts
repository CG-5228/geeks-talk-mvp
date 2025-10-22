import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  
  const skip = (page - 1) * limit;
  
  const where = {
    userId: session.user.id,
    ...(unreadOnly && { read: false })
  };
  
  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.notification.count({ where }),
    db.notification.count({
      where: {
        userId: session.user.id,
        read: false
      }
    })
  ]);
  
  return NextResponse.json({
    notifications,
    unreadCount,
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
  
  const { notificationIds, read } = await req.json();
  if (!notificationIds || !Array.isArray(notificationIds)) {
    return NextResponse.json({ error: 'Notification IDs array is required' }, { status: 400 });
  }
  
  await db.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId: session.user.id
    },
    data: { read }
  });
  
  return NextResponse.json({ message: 'Notifications updated' });
}
