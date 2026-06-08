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

    // Enforce hourly limit using per-like logs
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const likesInLastHour = await db.userLikeLog.count({
      where: {
        likedBy: session.user.id,
        userId: userId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (likesInLastHour >= maxLikesPerHour) {
      return NextResponse.json({
        error: `You can only like this user ${maxLikesPerHour} times per hour. Try again later.`,
        canLike: false,
        remainingLikes: 0,
        timeUntilNextLike: '1 hour',
      }, { status: 429 });
    }

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
    const canLike: boolean = true;
    let remainingLikes: number = 0;

    if (existingLike) {
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
      remainingLikes = maxLikesPerHour - (likesInLastHour + 1);
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

    // Record a like log for rate limiting
    await db.userLikeLog.create({
      data: {
        userId: userId,
        likedBy: session.user.id,
      },
    });

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

// DELETE /api/user/like - Unlike a user
export async function DELETE(req: NextRequest) {
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
      return NextResponse.json({ error: 'Cannot unlike yourself' }, { status: 400 });
    }

    // Check if like exists
    const existingLike = await db.userLike.findUnique({
      where: {
        userId_likedBy: {
          userId: userId,
          likedBy: session.user.id,
        },
      },
    });

    if (!existingLike) {
      return NextResponse.json({ error: 'Like not found' }, { status: 404 });
    }

    // Decrement like count or delete if it reaches 0
    if (existingLike.likeCount > 1) {
      await db.userLike.update({
        where: {
          id: existingLike.id,
        },
        data: {
          likeCount: {
            decrement: 1,
          },
        },
      });
    } else {
      await db.userLike.delete({
        where: {
          id: existingLike.id,
        },
      });
    }

    // Decrement likes count
    await db.user.update({
      where: { id: userId },
      data: {
        likesCount: {
          decrement: 1,
        },
      },
    });

    // Get updated likes count
    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: { likesCount: true },
    });

    return NextResponse.json({
      isLiked: existingLike.likeCount > 1,
      likesCount: updatedUser?.likesCount || 0,
    });
  } catch (error) {
    console.error('Error unliking user:', error);
    return NextResponse.json(
      { error: 'Failed to unlike user' },
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

    // Count like logs in the last hour for this user pair
    const totalRecentLikes = await db.userLikeLog.count({
      where: {
        likedBy: session.user.id,
        userId: userId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

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