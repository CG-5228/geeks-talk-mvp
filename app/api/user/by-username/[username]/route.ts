import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest, props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params;
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      displayName: true,
      email: true,
      image: true,
      coverImage: true,
      bio: true,
      pronouns: true,
      location: true,
      website: true,
      socialLinks: true,
      createdAt: true,
      onlineStatus: true,
      lastSeen: true,
      likesCount: true,
      profileVisibility: true,
      showOnlineStatus: true,
      showEmailOnProfile: true,
      _count: {
        select: {
          blogPosts: { where: { published: true } },
          blogComments: true,
        },
      },
      userBadges: {
        select: {
          awardedAt: true,
          badge: {
            select: {
              slug: true,
              name: true,
              description: true,
              icon: true,
              color: true,
              rarity: true,
            },
          },
        },
        orderBy: { awardedAt: 'desc' },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const isOwner = viewerId === user.id;
  let canView = true;

  if (!isOwner) {
    if (user.profileVisibility === 'private') canView = false;
    if (user.profileVisibility === 'friends' && viewerId) {
      const mutual = await db.follow.count({
        where: {
          OR: [
            { followerId: viewerId, followeeId: user.id, status: 'mutual' },
            { followerId: user.id, followeeId: viewerId, status: 'mutual' },
          ],
        },
      });
      if (mutual === 0) canView = false;
    } else if (user.profileVisibility === 'friends' && !viewerId) {
      canView = false;
    }
  }

  if (!canView) {
    return NextResponse.json(
      {
        user: {
          username: user.username,
          displayName: user.displayName,
          image: user.image,
          profileVisibility: user.profileVisibility,
          hidden: true,
        },
      },
      { status: 200 },
    );
  }

  const mutualCount = await db.follow.count({
    where: {
      OR: [
        { followerId: user.id, status: 'mutual' },
        { followeeId: user.id, status: 'mutual' },
      ],
    },
  });

  const isLiked = viewerId
    ? Boolean(
        await db.userLike.findFirst({
          where: { likedBy: viewerId, userId: user.id },
          select: { id: true },
        }),
      )
    : false;

  const publicUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    displayName: user.displayName,
    email: isOwner || user.showEmailOnProfile ? user.email : null,
    image: user.image,
    coverImage: user.coverImage,
    bio: user.bio,
    pronouns: user.pronouns,
    location: user.location,
    website: user.website,
    socialLinks: user.socialLinks,
    createdAt: user.createdAt,
    onlineStatus: user.showOnlineStatus || isOwner ? user.onlineStatus : null,
    lastSeen: user.showOnlineStatus || isOwner ? user.lastSeen : null,
    likesCount: user.likesCount,
    profileVisibility: user.profileVisibility,
    friendsCount: mutualCount,
    postCount: user._count.blogPosts,
    commentCount: user._count.blogComments,
    badges: user.userBadges.map((ub) => ({ ...ub.badge, awardedAt: ub.awardedAt })),
    isOwnProfile: isOwner,
    isLiked,
  };

  return NextResponse.json({ user: publicUser });
}
