import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateBase32Secret, buildOtpAuthUrl } from '@/lib/totp';
import { setPendingTotpSecret } from '@/lib/twoFactorPending';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, username: true, twoFactorEnabled: true },
  });
  if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (me.twoFactorEnabled) {
    return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
  }

  const secret = generateBase32Secret(20);
  const accountName = me.username || me.email;
  const otpauthUrl = buildOtpAuthUrl({ secret, accountName, issuer: 'Geeks Talk' });

  // Hold the secret pending verification (in Redis) instead of persisting it to
  // the user row before the user proves they can generate valid codes. Fall back
  // to the user row if Redis is unavailable so setup still works.
  const stored = await setPendingTotpSecret(session.user.id, secret);
  if (!stored) {
    await db.user.update({
      where: { id: session.user.id },
      data: { twoFactorSecret: secret },
    });
  }

  return NextResponse.json({ secret, otpauthUrl });
}
