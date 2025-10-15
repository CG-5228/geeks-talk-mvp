"use client";

import type { Channel } from '@/types/live';

export default function ChatHeader({ channel }: { channel: Channel | null }) {
  return (
    <div className="h-12 flex items-center gap-3 px-4 border-b border-[color:var(--nav-border)]/20">
      {channel ? (
        <>
          <div className="font-semibold text-[rgba(236,245,255,0.95)]">#{channel.name}</div>
          <div className="ml-2 text-xs rounded px-1.5 py-0.5 bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]">0 online</div>
        </>
      ) : (
        <div className="text-[rgba(220,235,255,0.8)]">Select a channel</div>
      )}
    </div>
  );
}
