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
  const userId = searchParams.get('userId') || session.user.id;

  try {
    const now = new Date();
    const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get comprehensive user stats
    const [
      totalMessages,
      messagesToday,
      totalChannels,
      helpfulPercentage,
      userStreak,
      userActivity,
      totalLikes,
      totalUsers
    ] = await Promise.all([
      // Total messages sent by user
      db.message.count({
        where: { authorId: userId }
      }),
      
      // Messages sent today
      db.message.count({
        where: {
          authorId: userId,
          createdAt: {
            gte: dayStart
          }
        }
      }),
      
      // Total channels/rooms user has participated in
      db.room.count({
        where: {
          messages: {
            some: {
              authorId: userId
            }
          }
        }
      }),
      
      // Calculate helpful percentage based on likes received vs total interactions
      calculateUserHelpfulPercentage(userId),
      
      // Calculate user streak based on recent activity
      calculateUserStreak(userId),
      
      // Get user activity data
      db.userActivity.findUnique({
        where: { userId }
      }),
      
      // Total likes received by user
      db.userLike.count({
        where: { userId }
      }),
      
      // Total users for helpful calculation
      db.user.count()
    ]);

    // Get user's online status and last seen
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        onlineStatus: true,
        lastSeen: true,
        likesCount: true
      }
    });

    return NextResponse.json({
      totalMessages,
      messagesToday,
      totalChannels,
      helpfulPercentage,
      userStreak,
      onlineStatus: user?.onlineStatus || 'offline',
      lastSeen: user?.lastSeen,
      likesCount: user?.likesCount || 0,
      totalLikes,
      activity: userActivity
    });
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
  }
}

// Helper function to calculate user helpful percentage
async function calculateUserHelpfulPercentage(userId: string): Promise<number> {
  try {
    const [likesReceived, totalInteractions] = await Promise.all([
      db.userLike.count({
        where: { userId }
      }),
      db.message.count({
        where: { authorId: userId }
      })
    ]);
    
    if (totalInteractions === 0) return 0;
    
    // Calculate percentage based on likes vs messages ratio
    const likesPerMessage = likesReceived / totalInteractions;
    const maxLikesPerMessage = 0.1; // Assume max 10% of messages get likes for 100%
    const percentage = Math.min((likesPerMessage / maxLikesPerMessage) * 100, 100);
    
    return Math.round(percentage);
  } catch (error) {
    console.error('Failed to calculate helpful percentage:', error);
    return 0;
  }
}

// Helper function to calculate user streak
async function calculateUserStreak(userId: string): Promise<number> {
  try {
    const now = new Date();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        lastSeen: true,
        createdAt: true
      }
    });

    if (!user) return 0;

    const lastSeen = user.lastSeen || user.createdAt;
    const daysSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
    
    // If user was active in last 7 days, count as active streak
    if (daysSinceLastSeen <= 7) {
      return 7 - daysSinceLastSeen;
    }
    return 0;
  } catch (error) {
    console.error('Failed to calculate user streak:', error);
    return 0;
  }
}
