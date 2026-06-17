"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRobustOfflineDetection } from '@/utils/useRobustOfflineDetection';

// Cross-subdomain session transfer is ONLY needed in development. In production
// the `.geekstalk.org` cookie domain (see lib/auth.ts) shares the session with
// the live subdomain natively, so we must NOT write an XSS-readable copy of the
// session to localStorage / a non-HttpOnly cookie there.
const IS_DEV = process.env.NODE_ENV !== 'production';

function sendHeartbeat() {
  fetch('/api/user/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'online' }),
  }).catch(() => {});
}

export default function SessionSharer() {
  const { data: session, status } = useSession();

  // Handle robust offline detection for all scenarios
  useRobustOfflineDetection();

  useEffect(() => {
    if (status === 'loading') return;

    const isLiveSubdomain = window.location.host.startsWith('live.');

    if (session && !isLiveSubdomain) {
      // Mark the user online immediately.
      sendHeartbeat();

      if (IS_DEV) {
        // Fetch a short-lived SIGNED transfer token and plant it where the live
        // subdomain (and the middleware) can read it. The token is a real signed
        // NextAuth JWT — not an unsigned blob — so it cannot be forged.
        fetch('/api/auth/dev-transfer-token')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            const token: string | undefined = data?.token;
            if (!token) return;
            sessionStorage.setItem('geeks-talk-session', token);
            localStorage.setItem('geeks-talk-session-transfer', token);
            document.cookie = `geeks-talk-session=${token}; path=/; max-age=300; SameSite=Lax`;
            document.cookie = `geeks-talk-session=${token}; path=/; max-age=300; SameSite=Lax; domain=localhost`;
            document.cookie = `geeks-talk-session=${token}; path=/; max-age=300; SameSite=Lax; domain=.localhost`;
          })
          .catch(() => {});
      }
    } else if (!session && isLiveSubdomain) {
      // On the live subdomain the middleware authenticates from the transfer
      // token (dev) or the shared cookie (prod); here we just mark online and
      // tidy the URL.
      sendHeartbeat();
      const url = new URL(window.location.href);
      if (url.searchParams.has('session')) {
        url.searchParams.delete('session');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [session, status]);

  return null; // This component doesn't render anything
}
