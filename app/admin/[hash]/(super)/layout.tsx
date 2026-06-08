import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

// Gates the (super) route group: broadcast, feature-flags, database, files,
// admins, site-banner. The parent admin layout already verifies the user is
// an admin and owns the session hash, so here we only need to reject anyone
// whose role isn't super-admin. Moderators get bounced to the dashboard
// instead of seeing a page shell they can't meaningfully use.
export default async function SuperAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/signin?callbackUrl=/');
  }

  const role = await getAdminRole(session.user.id);
  if (role !== 'super-admin') {
    redirect(`/admin/${hash}/dashboard`);
  }

  return <>{children}</>;
}
