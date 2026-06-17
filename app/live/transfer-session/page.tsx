"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TransferSessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, setTransferring] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/signin');
      return;
    }

    setTransferring(true);
    const redirectUrl = searchParams.get('redirect') || 'http://live.localhost:3000/text';

    // Fetch a short-lived SIGNED token to carry to the live subdomain. In
    // production this endpoint 404s (the shared `.geekstalk.org` cookie already
    // authenticates the subdomain), so we just redirect without a token.
    fetch('/api/auth/dev-transfer-token')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const token: string = data?.token || '';
        const sep = redirectUrl.includes('?') ? '&' : '?';
        const liveUrl = token
          ? `${redirectUrl}${sep}session=${encodeURIComponent(token)}`
          : redirectUrl;
        setTimeout(() => {
          window.location.href = liveUrl;
        }, 500);
      })
      .catch(() => {
        window.location.href = redirectUrl;
      });
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
