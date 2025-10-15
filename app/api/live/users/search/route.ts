import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// GET /api/live/users/search?q=searchTerm - Search users by username/name
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
  }

  const currentUserId = (session.user as any).id;
  const searchTerm = query.trim();

  try {
    // Search users by username or name, excluding current user
    const users = await db.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          {
            username: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        onlineStatus: true,
        lastSeen: true
      },
      take: 20, // Limit results
      orderBy: [
        // Prioritize exact matches
        { username: 'asc' },
        { name: 'asc' }
      ]
    });

    // Format user data
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name || 'User',
      username: user.username || 'user',
      image: user.image,
      onlineStatus: user.onlineStatus as 'online' | 'offline' | 'away',
      lastSeen: user.lastSeen?.toISOString() || null
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
