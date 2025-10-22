"use client";

import { Suspense } from 'react';
import ChatDashboard from '../ChatDashboard';

export const dynamic = 'force-dynamic';

function LiveFallbackContent() {
  return (
    <div className="w-full overflow-hidden">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4 mx-4 mt-4">
        <div className="flex items-center gap-2 text-yellow-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Fallback Mode</span>
        </div>
        <p className="text-yellow-300/80 text-sm mt-1">
          You're using the fallback route. For the best experience, use the live subdomain: <code className="bg-yellow-500/20 px-1 rounded">live.{window.location.host}</code>
        </p>
      </div>
      <ChatDashboard />
    </div>
  );
}

export default function LiveFallbackPage() {
  return (
    <Suspense fallback={<div className="w-full overflow-hidden">Loading...</div>}>
      <LiveFallbackContent />
    </Suspense>
  );
}
