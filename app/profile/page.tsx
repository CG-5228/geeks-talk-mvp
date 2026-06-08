import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ProfileIndexPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Sign in to view profiles</h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to view user profiles.
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

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (me?.username) {
    redirect(`/profile/${me.username}`);
  }

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-8">
        <h1 className="text-xl font-semibold text-foreground mb-1">Pick a username</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your profile URL needs a username. Set one in settings.
        </p>
        <Link
          href="/settings"
          className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Go to settings
        </Link>
      </div>
    </div>
  );
}
