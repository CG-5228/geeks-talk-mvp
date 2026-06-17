import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, getAdminRole } from '@/lib/admin';
import { validateSessionAdminHash, generateSessionAdminHash } from '@/lib/adminSession';
import AdminSidebar from '@/components/admin/AdminSidebar';
import CommandPalette from '@/components/admin/CommandPalette';
import { AdminToastProvider } from '@/components/admin/AdminToast';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
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

  if (!(await isAdmin(session.user.id))) {
    redirect('/');
  }

  const hashOwner = validateSessionAdminHash(hash);

  if (!hashOwner || hashOwner !== session.user.id) {
    const fresh = generateSessionAdminHash(session.user.id);
    redirect(`/admin/${fresh}/dashboard`);
  }

  const role = await getAdminRole(session.user.id);

  return (
    <AdminToastProvider>
      <div className="min-h-screen bg-background flex">
        <AdminSidebar adminHash={hash} role={role ?? 'moderator'} />
        <div className="flex-1 overflow-auto">{children}</div>
        <CommandPalette adminHash={hash} role={role ?? 'moderator'} />
      </div>
    </AdminToastProvider>
  );
}
