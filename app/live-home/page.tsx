"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LiveHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to text chat by default
    router.replace('/text');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
        <p className="text-white/70">Redirecting to Text Chat...</p>
      </div>
    </div>
  );
}
