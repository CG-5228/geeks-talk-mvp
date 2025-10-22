"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TransferSessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    const redirectUrl = searchParams.get('redirect');

    if (session) {
      // We have a session, transfer it to the live subdomain
      setTransferring(true);

      const sessionData = {
        user: session.user,
        expires: session.expires,
        timestamp: Date.now()
      };

      // Store session data for transfer
      sessionStorage.setItem('geeks-talk-session', JSON.stringify(sessionData));
      localStorage.setItem('geeks-talk-session-transfer', JSON.stringify(sessionData));

      // Set cookies
      const cookieValue = btoa(JSON.stringify(sessionData));
      document.cookie = `geeks-talk-session=${cookieValue}; path=/; max-age=3600; SameSite=Lax`;
      document.cookie = `geeks-talk-session=${cookieValue}; path=/; max-age=3600; SameSite=Lax; domain=localhost`;
      document.cookie = `geeks-talk-session=${cookieValue}; path=/; max-age=3600; SameSite=Lax; domain=.localhost`;

      // Redirect to live subdomain with session data in URL
      if (redirectUrl) {
        const sessionParam = btoa(JSON.stringify(sessionData));
        const liveUrl = redirectUrl.includes('?')
          ? `${redirectUrl}&session=${sessionParam}`
          : `${redirectUrl}?session=${sessionParam}`;

        setTimeout(() => {
          window.location.href = liveUrl;
        }, 1000);
      } else {
        // Default redirect to live subdomain
        const sessionParam = btoa(JSON.stringify(sessionData));
        const liveUrl = `http://live.localhost:3000/text?session=${sessionParam}`;

        console.log('🔗 Redirecting to live subdomain (default):', liveUrl);
        setTimeout(() => {
          window.location.href = liveUrl;
        }, 1000);
      }
      return;
    }

    if (!session) {
      // No session, redirect to signin
      router.replace('/signin');
      return;
    }
  }, [session, status, searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Transferring session to live subdomain...</p>
      </div>
    </div>
  );
}
