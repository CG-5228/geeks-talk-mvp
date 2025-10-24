import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/user/like - Toggle like for a user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot like yourself' }, { status: 400 });
    }

    // Get hourly like limit from environment
    const maxLikesPerHour = parseInt(process.env.MAX_LIKES_PER_USER_PER_HOUR || '3');
    
    // Check if like already exists
    const existingLike = await db.userLike.findUnique({
      where: {
        userId_likedBy: {
          userId: userId,
          likedBy: session.user.id,
        },
      },
    });

    let isLiked: boolean;
    let likesCount: number;
    let canLike: boolean = true;
    let remainingLikes: number = 0;

    if (existingLike) {
      // Check if we can add more likes (within hourly limit)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLikes = await db.userLike.findMany({
        where: {
          likedBy: session.user.id,
          userId: userId,
          createdAt: {
            gte: oneHourAgo,
          },
        },
      });

      const totalRecentLikes = recentLikes.reduce((sum, like) => sum + like.likeCount, 0);
      
      if (totalRecentLikes >= maxLikesPerHour) {
        return NextResponse.json({ 
          error: `You can only like this user ${maxLikesPerHour} times per hour. Try again later.`,
          canLike: false,
          remainingLikes: 0,
          timeUntilNextLike: '1 hour'
        }, { status: 429 });
      }

      // Increment like count
      await db.userLike.update({
        where: {
          id: existingLike.id,
        },
        data: {
          likeCount: {
            increment: 1,
          },
        },
      });

      // Increment likes count
      await db.user.update({
        where: { id: userId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      });

      isLiked = true;
      remainingLikes = maxLikesPerHour - (totalRecentLikes + 1);
    } else {
      // Create new like
      await db.userLike.create({
        data: {
          userId: userId,
          likedBy: session.user.id,
          likeCount: 1,
        },
      });

      // Increment likes count
      await db.user.update({
        where: { id: userId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      });

      isLiked = true;
      remainingLikes = maxLikesPerHour - 1;
    }

    // Get updated likes count
    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: { likesCount: true },
    });

    likesCount = updatedUser?.likesCount || 0;

    return NextResponse.json({
      isLiked,
      likesCount,
      canLike,
      remainingLikes,
    });
  } catch (error) {
    console.error('Error toggling user like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}

// GET /api/user/like?userId=xxx - Check if current user has liked a specific user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const maxLikesPerHour = parseInt(process.env.MAX_LIKES_PER_USER_PER_HOUR || '3');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Get recent likes given to this user
    const recentLikes = await db.userLike.findMany({
      where: {
        likedBy: session.user.id,
        userId: userId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    const totalRecentLikes = recentLikes.reduce((sum, like) => sum + like.likeCount, 0);
    const canLike = totalRecentLikes < maxLikesPerHour;
    const remainingLikes = Math.max(0, maxLikesPerHour - totalRecentLikes);

    const like = await db.userLike.findUnique({
      where: {
        userId_likedBy: {
          userId: userId,
          likedBy: session.user.id,
        },
      },
    });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { likesCount: true },
    });

    return NextResponse.json({
      isLiked: !!like,
      likesCount: user?.likesCount || 0,
      canLike,
      remainingLikes,
      likesGivenInLastHour: totalRecentLikes,
    });
  } catch (error) {
    console.error('Error checking user like:', error);
    return NextResponse.json(
      { error: 'Failed to check like status' },
      { status: 500 }
    );
  }
}