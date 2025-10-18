"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LiveLayout from '@/components/live/LiveLayout';
import ChatDashboard from './ChatDashboard';

export const dynamic = 'force-dynamic';

function LivePageContent() {
  const params = useSearchParams();
  const tabParam = (params.get('tab') as 'text' | 'voice' | 'tutorials') || 'text';
  const channelParam = params.get('channel');
  const [channelSlug, setChannelSlug] = useState<string | null>(channelParam);

  return (
    <div className="w-full overflow-hidden">
      {tabParam === 'text' ? (
        <ChatDashboard />
      ) : (
        <LiveLayout activeTab={tabParam} selectedSlug={channelSlug} onSelectSlug={setChannelSlug} />
      )}
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={<div className="w-full overflow-hidden">Loading...</div>}>
      <LivePageContent />
    </Suspense>
  );
}
