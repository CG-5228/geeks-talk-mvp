"use client";

import { Suspense } from 'react';
import ChatDashboard from '../live/ChatDashboard';

export const dynamic = 'force-dynamic';

export default function TextChatPage() {
  return (
    <div className="w-full overflow-hidden">
      <Suspense fallback={<div className="w-full overflow-hidden">Loading...</div>}>
        <ChatDashboard />
      </Suspense>
    </div>
  );
}
