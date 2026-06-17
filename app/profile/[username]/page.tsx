import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import ProfileHeader, { ProfileHeaderData } from '@/components/profile/ProfileHeader';
import ProfileTabsClient from '@/components/profile/ProfileTabsClient';
import ProfileCompletionMeter from '@/components/profile/ProfileCompletionMeter';
import { Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage(props: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await props.params;
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      emailVerified: true,
      image: true,
      coverImage: true,
      bio: true,
      pronouns: true,
      location: true,
      website: true,
      socialLinks: true,
      createdAt: true,
      onlineStatus: true,
      likesCount: true,
      twoFactorEnabled: true,
      profileVisibility: true,
      showOnlineStatus: true,
      showEmailOnProfile: true,
      _count: {
        select: { blogPosts: { where: { published: true } }, blogComments: true },
      },
    },
  });

  if (!user) notFound();

  const isOwner = viewerId === user.id;

  let canView = true;
  if (!isOwner) {
    if (user.profileVisibility === 'private') canView = false;
    else if (user.profileVisibility === 'friends') {
      if (!viewerId) {
        canView = false;
      } else {
        const mutual = await db.follow.count({
          where: {
            OR: [
              { followerId: viewerId, followeeId: user.id, status: 'mutual' },
              { followerId: user.id, followeeId: viewerId, status: 'mutual' },
            ],
          },
        });
        if (mutual === 0) canView = false;
      }
    }
  }

  if (!canView) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-8">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-foreground mb-1">
            @{user.username}&apos;s profile is private
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {user.profileVisibility === 'friends'
              ? 'Only mutual friends can view this profile.'
              : 'This profile is hidden.'}
          </p>
          <Link
            href="/"
            className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const [friendsCount, isLiked] = await Promise.all([
    db.follow.count({
      where: {
        OR: [
          { followerId: user.id, status: 'mutual' },
          { followeeId: user.id, status: 'mutual' },
        ],
      },
    }),
    viewerId
      ? db.userLike
          .findFirst({
            where: { likedBy: viewerId, userId: user.id },
            select: { id: true },
          })
          .then(Boolean)
      : Promise.resolve(false),
  ]);

  const social = (user.socialLinks as Record<string, string | null> | null) || null;

  const header: ProfileHeaderData = {
    userId: user.id,
    username: user.username || '',
    displayName: user.displayName,
    image: user.image,
    coverImage: user.coverImage,
    bio: user.bio,
    pronouns: user.pronouns,
    location: user.location,
    website: user.website,
    socialLinks: social,
    createdAt: user.createdAt,
    friendsCount,
    postCount: user._count.blogPosts,
    likesCount: user.likesCount,
    isLiked,
    isOwnProfile: isOwner,
    onlineStatus: user.showOnlineStatus || isOwner ? user.onlineStatus : null,
    emailVerified: Boolean(user.emailVerified),
    twoFactorEnabled: user.twoFactorEnabled,
  };

  const Overview = (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">About</h2>
          {user.bio ? (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {user.bio}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isOwner ? 'Your bio is empty — add one in settings.' : 'No bio yet.'}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Stats</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Posts published</dt>
              <dd className="text-foreground font-medium">{user._count.blogPosts}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Comments</dt>
              <dd className="text-foreground font-medium">{user._count.blogComments}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Likes received</dt>
              <dd className="text-foreground font-medium">{user.likesCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mutual friends</dt>
              <dd className="text-foreground font-medium">{friendsCount}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="space-y-4">
        {isOwner && (
          <ProfileCompletionMeter
            image={user.image}
            displayName={user.displayName}
            bio={user.bio}
            pronouns={user.pronouns}
            location={user.location}
            website={user.website}
            socialLinks={social}
            emailVerified={Boolean(user.emailVerified)}
            twoFactorEnabled={user.twoFactorEnabled}
          />
        )}
        {isOwner && user.showEmailOnProfile && user.email && (
          <div className="rounded-xl border border-border/20 bg-card/30 p-5 text-sm">
            <div className="text-xs text-muted-foreground">Contact</div>
            <div className="text-foreground">{user.email}</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <ProfileHeader profile={header} />
        <ProfileTabsClient username={user.username || undefined} overview={Overview} />
      </div>
    </div>
  );
}
