'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminDefaultPage() {
  const params = useParams();
  const router = useRouter();
  const hash = params.hash as string;
  
  useEffect(() => {
    // Redirect to dashboard by default
    router.push(`/admin/${hash}/dashboard`);
  }, [hash, router]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
        <p className="text-white/70">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
