"use client";

import type { Channel } from '@/types/live';

export default function ChannelItem({ channel, active, onClick, collapsed }: { channel: Channel; active: boolean; onClick: () => void; collapsed: boolean; }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/5 ${active ? 'bg-white/5 ring-1 ring-[hsl(var(--primary))]/30' : ''}`}
      title={collapsed ? `${channel.name} • 0 online` : undefined}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
      {!collapsed && <span className="truncate text-[rgba(236,245,255,0.95)]">{channel.name}</span>}
      <span className="ml-auto text-xs rounded px-1.5 py-0.5 bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]">0</span>
    </button>
  );
}
