import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { encode } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// DEVELOPMENT ONLY. Mints a short-lived, SIGNED session token the client can
// carry to the live.localhost subdomain (the host-only dev session cookie isn't
// shared across localhost subdomains). In production the `.geekstalk.org` cookie
// domain shares the session natively, so this endpoint is disabled — closing the
// old hole where the middleware trusted an unsigned base64 session blob.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const u = session.user as any;
  // Re-encode the current session as a standard NextAuth JWT (signed with
  // NEXTAUTH_SECRET) — the middleware verifies it and uses it as-is.
  const token = await encode({
    token: { id: u.id, email: u.email, name: u.name, image: u.image },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 5 * 60,
  });
  return NextResponse.json({ token });
}
