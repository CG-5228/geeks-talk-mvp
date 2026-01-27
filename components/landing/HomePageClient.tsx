"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPageContent from './LandingPageContent';

export default function HomePageClient() {
  const router = useRouter();

  useEffect(() => {
    // Check if we're on the live subdomain
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLiveSubdomain = hostname.startsWith('live.');
      
      if (isLiveSubdomain) {
        // Redirect to text chat on live subdomain
        router.replace('/text');
        return;
      }
    }
  }, [router]);

  // If on live subdomain, show loading while redirecting
  if (typeof window !== 'undefined' && window.location.hostname.startsWith('live.')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-white/70">Redirecting to chat...</p>
        </div>
      </div>
    );
  }

  // Show landing page on main domain
  return <LandingPageContent />;
}
