import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { channelId } = params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Check if user has access to this channel
    const channel = await db.room.findUnique({
      where: { id: channelId },
      select: { 
        id: true, 
        visibility: true, 
        participants: true,
        ownerId: true 
      },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if user can access this channel
    const canAccess = channel.visibility === 'public' || 
                     channel.participants.includes(session.user.id) ||
                     channel.ownerId === session.user.id;

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get channel members (users who have sent messages in this channel or are participants)
    const members = await db.user.findMany({
      where: {
        OR: [
          { id: { in: channel.participants } },
          { 
            messages: {
              some: {
                roomId: channelId
              }
            }
          }
        ],
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        onlineStatus: true,
        lastSeen: true,
        likesCount: true,
        createdAt: true,
      },
      orderBy: [
        { onlineStatus: 'desc' },
        { name: 'asc' }
      ]
    });

    // Get like status for each member
    const membersWithLikeStatus = await Promise.all(
      members.map(async (member) => {
        if (member.id === session.user.id) {
          return {
            ...member,
            canLike: false,
            isLiked: false,
            remainingLikes: 0,
          };
        }

        // Check if current user has liked this member
        const like = await db.userLike.findUnique({
          where: {
            userId_likedBy: {
              userId: member.id,
              likedBy: session.user.id,
            },
          },
        });

        // Check hourly like limit
        const maxLikesPerHour = parseInt(process.env.MAX_LIKES_PER_USER_PER_HOUR || '3');
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        const recentLikes = await db.userLike.findMany({
          where: {
            likedBy: session.user.id,
            userId: member.id,
            createdAt: {
              gte: oneHourAgo,
            },
          },
        });

        const totalRecentLikes = recentLikes.reduce((sum, like) => sum + like.likeCount, 0);
        const canLike = totalRecentLikes < maxLikesPerHour;
        const remainingLikes = Math.max(0, maxLikesPerHour - totalRecentLikes);

        return {
          ...member,
          canLike,
          isLiked: !!like,
          remainingLikes,
        };
      })
    );

    return NextResponse.json({
      members: membersWithLikeStatus,
      total: membersWithLikeStatus.length,
    });

  } catch (error) {
    console.error('Error fetching channel members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel members' },
      { status: 500 }
    );
  }
}
