"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LiveFallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to live subdomain if possible, otherwise show fallback
    const currentHost = window.location.host;
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      // For local development, try to redirect to live subdomain
      const liveHost = currentHost.replace(/^[^.]+\./, 'live.');
      if (liveHost !== currentHost) {
        window.location.href = `${window.location.protocol}//${liveHost}/text`;
        return;
      }
    }
    
    // If subdomain redirect fails, show fallback content
    router.replace('/live/fallback');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to live chat...</p>
      </div>
    </div>
  );
}
