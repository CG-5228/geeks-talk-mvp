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
  const q = searchParams.get('q');
  
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }
  
  const users = await db.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
        { username: { contains: q, mode: 'insensitive' as const } }
      ]
    },
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
      }
    },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
  
  return NextResponse.json({ users });
}
