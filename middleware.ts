import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { encode } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const isLiveSubdomain = hostname.startsWith('live.');

        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {

          console.log('Cookies:', req.headers.get('cookie'));

          console.log('URL Search Params:', req.nextUrl.searchParams.toString());

          // Check for shared session cookie specifically
          const cookies = req.headers.get('cookie');
          if (cookies && cookies.includes('geeks-talk-session=')) {

          } else {

          }
        }

  // Get token with proper cookie domain handling for cross-subdomain
  let token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: 'next-auth.session-token',
    secureCookie: process.env.NODE_ENV === 'production'
  });

  // For live subdomain in development, check for shared session data
  if (!token && isLiveSubdomain && process.env.NODE_ENV === 'development') {
    let sessionData = null;

    // First check URL parameters for session data
    const sessionParam = req.nextUrl.searchParams.get('session');
    if (sessionParam) {
      try {
        sessionData = JSON.parse(Buffer.from(sessionParam, 'base64').toString());
        if (sessionData.user && sessionData.expires && new Date(sessionData.expires) > new Date()) {

        } else {
          sessionData = null;
        }
      } catch (error) {
        console.log('❌ Failed to parse URL session parameter:', error instanceof Error ? error.message : String(error));
        sessionData = null;
      }
    }

    // If no URL parameter, check cookies
    if (!sessionData) {
      const cookies = req.headers.get('cookie');

      // Check for shared session cookie
      if (cookies && cookies.includes('geeks-talk-session=')) {
        const sessionMatch = cookies.match(/geeks-talk-session=([^;]+)/);
        if (sessionMatch) {
          try {
            // Decode base64 session data
            sessionData = JSON.parse(Buffer.from(sessionMatch[1], 'base64').toString());
            if (sessionData.user && sessionData.expires && new Date(sessionData.expires) > new Date()) {

            } else {
              sessionData = null;
            }
          } catch (error) {
            console.log('❌ Failed to parse shared session cookie:', error instanceof Error ? error.message : String(error));
            sessionData = null;
          }
        }
      }
    }

    // If we have valid session data, create a proper NextAuth token
    if (sessionData) {
      try {
        // Create a proper NextAuth JWT token
        const jwtToken = await encode({
          token: {
            id: sessionData.user.id,
            email: sessionData.user.email,
            name: sessionData.user.name,
            image: sessionData.user.image,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(new Date(sessionData.expires).getTime() / 1000),
            jti: `shared-${sessionData.user.id}-${Date.now()}`
          },
          secret: process.env.NEXTAUTH_SECRET!
        });

        // Create token object for middleware
        token = {
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name,
          image: sessionData.user.image
        };

        // We'll set the cookie in the response below
        // Store the JWT token for later use
        (req as any).nextAuthToken = jwtToken;
      } catch (error) {
        console.log('❌ Failed to create NextAuth token:', error instanceof Error ? error.message : String(error));
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