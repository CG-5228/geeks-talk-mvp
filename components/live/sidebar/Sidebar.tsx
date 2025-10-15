"use client";

import { useEffect, useState } from 'react';
import ChannelList from '@/components/live/sidebar/ChannelList';
import CreateChannelDialog from '@/components/live/CreateChannelDialog';
import type { Channel } from '@/types/live';

export default function Sidebar({ channels, activeChannelId, onSelect, onCreate }: { channels: Channel[]; activeChannelId: string | null; onSelect: (c: Channel) => void; onCreate?: (name: string, topic?: string) => Promise<void> }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem('geekstalk-live-sidebar');
      if (v) setCollapsed(v === '1');
    } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c; try { localStorage.setItem('geekstalk-live-sidebar', next ? '1' : '0'); } catch {}
      return next;
    });
  };
  const width = collapsed ? 'w-[72px]' : 'w-[280px]';
  return (
    <aside
      data-collapsed={collapsed ? 'true' : 'false'}
      className={`shrink-0 border-r border-[color:var(--nav-border)]/20 bg-[color:var(--card-bg)]/40 backdrop-blur-xl ${width} transition-[width] duration-200 overflow-hidden flex flex-col`}
    >
      <div className="h-12 flex items-center px-2">
        <button aria-label="Toggle sidebar" onClick={toggle} className="rounded p-2 hover:bg-white/5">
          <div className="space-y-1">
            <div className="h-0.5 w-5 bg-white/70" />
            <div className="h-0.5 w-5 bg-white/70" />
            <div className="h-0.5 w-5 bg-white/70" />
          </div>
        </button>
      </div>
      <ChannelList channels={channels} activeChannelId={activeChannelId} onSelect={onSelect} collapsed={collapsed} />
      <div className="mt-auto p-2 border-t border-[color:var(--nav-border)]/20">
        <CreateChannelDialog onCreate={onCreate ?? (async () => {})} collapsed={collapsed} />
      </div>
    </aside>
  );
}
