import { NextResponse } from 'next/server';
import { getToken, decode } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const isLiveSubdomain = hostname.startsWith('live.');

  // Get token with proper cookie domain handling for cross-subdomain
  let token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: 'next-auth.session-token',
    secureCookie: process.env.NODE_ENV === 'production'
  });

  // In development the host-only session cookie isn't shared with the
  // live.localhost subdomain, so the main domain hands over a SHORT-LIVED,
  // SIGNED transfer token (see /api/auth/dev-transfer-token). We verify its
  // signature here before trusting it — the previous implementation accepted an
  // unsigned base64 session blob, which let anyone forge a session.
  if (!token && isLiveSubdomain && process.env.NODE_ENV === 'development') {
    const sessionParam = req.nextUrl.searchParams.get('session');
    let transferToken: string | null = sessionParam;
    if (!transferToken) {
      const cookieMatch = (req.headers.get('cookie') || '').match(/geeks-talk-session=([^;]+)/);
      if (cookieMatch) transferToken = decodeURIComponent(cookieMatch[1]);
    }
    if (transferToken) {
      try {
        const decoded = await decode({ token: transferToken, secret: process.env.NEXTAUTH_SECRET! });
        if (decoded && (decoded as any).id) {
          token = {
            id: (decoded as any).id,
            email: decoded.email,
            name: decoded.name,
            image: (decoded as any).image ?? (decoded as any).picture ?? null,
          } as any;
          // The transfer token is itself a valid signed session JWT — reuse it
          // directly as the subdomain's session cookie (set in the response).
          (req as any).nextAuthToken = transferToken;
        }
      } catch (error) {
        console.log('❌ Invalid dev transfer token:', error instanceof Error ? error.message : String(error));
      }
    }
  }

  // Debug token retrieval
  if (process.env.NODE_ENV === 'development') {

  }

  // Pass subdomain flag via header for layout consumption
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-is-live-subdomain', isLiveSubdomain ? 'true' : 'false');

  // Handle authentication for live subdomain (but allow signin, signup, and reset pages)
  if (isLiveSubdomain && !token && !req.nextUrl.pathname.startsWith('/signin') && !req.nextUrl.pathname.startsWith('/signup') && !req.nextUrl.pathname.startsWith('/reset')) {
    const signInUrl = new URL('/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', `${req.nextUrl.protocol}//${hostname}/text`);
    return NextResponse.redirect(signInUrl);
  }

  // Admin route protection
  if (req.nextUrl.pathname.startsWith('/admin/')) {
    if (!token) {
      return NextResponse.redirect(new URL('/signin', req.url));
    }
    // Admin hash validation will be handled by the admin layout component
  }

  // Existing auth protection for API routes
  if (!token && (req.nextUrl.pathname.startsWith('/api/messages') || req.nextUrl.pathname.startsWith('/api/voice/token'))) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set NextAuth session cookie if we created one
  if ((req as any).nextAuthToken) {
    response.cookies.set('next-auth.session-token', (req as any).nextAuthToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/api/messages/:path*',
    '/api/voice/token/:path*',
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};