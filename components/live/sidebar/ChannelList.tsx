"use client";

import type { Channel } from '@/types/live';
import ChannelItem from '@/components/live/sidebar/ChannelItem';

export default function ChannelList({ channels, activeChannelId, onSelect, collapsed }: { channels: Channel[]; activeChannelId: string | null; onSelect: (c: Channel) => void; collapsed: boolean; }) {
  const byCategory = channels.reduce<Record<string, Channel[]>>((acc, c) => {
    acc[c.category] = acc[c.category] || [];
    acc[c.category].push(c);
    return acc;
  }, {});
  const order = ['General', 'Computer General', 'Programming', 'Cybersecurity', 'Mathematics'];
  return (
    <div className="px-2 py-2 space-y-3">
      {order.map((cat) => (
        <div key={cat}>
          {!collapsed ? (
            <div className="px-2 pb-1 text-xs uppercase tracking-wide text-[rgba(220,235,255,0.6)] flex items-center justify-between">
              <span>{cat}</span>
              <span className="text-[rgba(220,235,255,0.4)]">{(byCategory[cat] || []).length}</span>
            </div>
          ) : (
            <div className="h-2" />
          )}
          <div className="space-y-1">
            {(byCategory[cat] || []).map((c) => (
              <ChannelItem key={c.id} channel={c} active={c.id === activeChannelId} onClick={() => onSelect(c)} collapsed={collapsed} />)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
