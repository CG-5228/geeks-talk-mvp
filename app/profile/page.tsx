import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import ProfileDisplay from '@/components/profile/ProfileDisplay';
import Link from 'next/link';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Sign in to view profiles</h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to view user profiles
          </p>
          <Link
            href="/signin"
            className="inline-flex px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const user = await db.user.findUnique({ 
    where: { id: (session.user as any).id },
    select: {
      id: true,
      username: true,
      email: true,
      image: true,
      createdAt: true,
    }
  });

  if (!user) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-foreground">User not found.</div>
      </div>
    );
  }

  // Use any-cast for Follow until migration is applied
  const followClient: any = db as any;
  const friendsCount = await followClient.follow?.count?.({
    where: {
      OR: [
        { followerId: user.id, status: 'mutual' },
        { followeeId: user.id, status: 'mutual' },
      ],
    },
  }) ?? 0;

  const profileData = {
    username: user.username || 'user',
    displayName: null, // Will come from DB when field is added
    bio: null, // Will come from DB when field is added
    email: user.email,
    image: user.image,
    createdAt: user.createdAt,
    friendsCount,
    isOwnProfile: true,
  };

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProfileDisplay profile={profileData} />
      </div>
    </div>
  );
}
