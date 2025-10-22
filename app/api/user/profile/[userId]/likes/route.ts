import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = params.userId;
  
  // Get user with likes count
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      likesCount: true
    }
  });
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  // Check if current user has liked this user
  const hasLiked = await db.userLike.findUnique({
    where: {
      userId_likedBy: {
        userId,
        likedBy: session.user.id
      }
    }
  });
  
  return NextResponse.json({
    userId: user.id,
    name: user.name,
    username: user.username,
    likesCount: user.likesCount,
    hasLiked: !!hasLiked
  });
}
