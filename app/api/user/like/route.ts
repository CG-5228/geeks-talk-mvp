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

    if (existingLike) {
      // Unlike: Remove the like
      await db.userLike.delete({
        where: {
          id: existingLike.id,
        },
      });

      // Decrement likes count
      await db.user.update({
        where: { id: userId },
        data: {
          likesCount: {
            decrement: 1,
          },
        },
      });

      isLiked = false;
    } else {
      // Like: Create new like
      await db.userLike.create({
        data: {
          userId: userId,
          likedBy: session.user.id,
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
    });
  } catch (error) {
    console.error('Error checking user like:', error);
    return NextResponse.json(
      { error: 'Failed to check like status' },
      { status: 500 }
    );
  }
}