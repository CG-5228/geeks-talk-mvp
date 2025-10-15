"use client";

import { useEffect, useRef, useState } from 'react';
import ChatsSidebar from '@/components/live/shell/ChatsSidebar';
import Conversation from '@/components/live/channel/Conversation';
import DetailsDrawer from '@/components/live/DetailsDrawer';
import type { Channel, LiveMessage } from '@/types/live';
import type { LiveCounts } from '@/types/live';
import io from 'socket.io-client';

export default function LiveLayout({ activeTab = 'text', selectedSlug, onSelectSlug }: { activeTab?: 'text' | 'voice' | 'tutorials'; selectedSlug?: string | null; onSelectSlug?: (slug: string) => void }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsPinned, setDetailsPinned] = useState(false);
  const [counts, setCounts] = useState<LiveCounts>({});
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const presenceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Ensure defaults for CSS vars at mount
    const root = document.documentElement;
    if (!root.style.getPropertyValue('--sidebar')) root.style.setProperty('--sidebar', '300px');
    if (!root.style.getPropertyValue('--details')) root.style.setProperty('--details', '0px');
  }, []);

  useEffect(() => {
    fetch('/api/live/channels')
      .then((r) => r.json())
      .then((data) => {
        const pub = data.public as Channel[];
        setChannels(pub);
        if (selectedSlug) {
          const match = pub.find((c) => c.slug === selectedSlug) ?? null;
          setActiveChannel(match ?? pub[0] ?? null);
        } else {
          setActiveChannel(pub[0] ?? null);
        }
      })
      .catch(() => {});
  }, [selectedSlug]);

  // Initialize socket connection once
  useEffect(() => {
    if (socketRef.current) return;
    const socket = io('/live');
    socketRef.current = socket;
    socket.on('presence:update', (payload: LiveCounts) => setCounts((prev) => ({ ...prev, ...payload })));
    socket.on('message:new', (msg: LiveMessage) => {
      setMessages((prev) => (activeChannel && msg.channelId === activeChannel.id ? [...prev, msg] : prev));
    });
    socket.on('message:edit', (msg: LiveMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });
    socket.on('message:delete', (id: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // On channel change: leave old, join new room first, then fetch history
  useEffect(() => {
    const socket = socketRef.current;
    const channelId = activeChannel?.id;
    if (!socket || !channelId) return;
    socket.emit('room:join', { room: `channel:${channelId}` }, () => {
      fetch(`/api/live/messages?channel=${encodeURIComponent(channelId)}&limit=50`)
        .then((r) => r.json())
        .then((data) => {
          setMessages((data.messages || []) as LiveMessage[]);
        })
        .catch(() => setMessages([]));
    });
    return () => {
      socket.emit('room:leave', { room: `channel:${channelId}` });
    };
  }, [activeChannel?.id]);

  const onSend = async (text: string) => {
    if (!activeChannel) return;
    // optimistic append
    const optimistic: LiveMessage = {
      id: `tmp-${Math.random().toString(36).slice(2)}`,
      channelId: activeChannel.id,
      authorId: 'me',
      authorName: 'You',
      content: text,
      type: 'text',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch('/api/live/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: activeChannel.id, content: text }),
      });
      if (res.ok) {
        const created = (await res.json()) as LiveMessage;
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? created : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  };

  const onCreateChannel = async (name: string, topic?: string) => {
    const res = await fetch('/api/live/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, topic }) });
    if (!res.ok) return;
    const ch: Channel = await res.json();
    setChannels((prev) => [ch, ...prev]);
    setActiveChannel(ch);
  };

  // Reflect details pinned state to CSS variable --details
  useEffect(() => {
    const root = document.documentElement;
    if (detailsPinned) {
      root.style.setProperty('--details', '320px');
    } else {
      root.style.setProperty('--details', '0px');
    }
  }, [detailsPinned]);

  useEffect(() => {
    // Restore pin from localStorage if present
    const saved = localStorage.getItem('gt_details_pinned');
    if (saved === '1') setDetailsPinned(true);
  }, []);

  return (
    <div className="relative z-10 w-full min-h-[calc(100vh-var(--header-h))] pt-[var(--subnav-h)]">
      <div id="live-grid" className="grid w-full min-h-[calc(100vh-var(--header-h)-var(--subnav-h,0px))] grid-cols-[var(--sidebar,300px)_1fr] gap-0">
        <ChatsSidebar
          channels={channels}
          activeId={activeChannel?.id ?? null}
          counts={counts}
          onSelect={(c: Channel) => {
            setActiveChannel(c);
            onSelectSlug?.(c.slug);
          }}
          onCreate={onCreateChannel}
        />
        <main className="min-w-0 flex flex-col w-full relative">
          {activeTab === 'text' ? (
            <Conversation channel={activeChannel} messages={messages} />
          ) : activeTab === 'voice' ? (
            <div className="p-6 text-[rgba(220,235,255,0.85)]">Voice Chat — TODO</div>
          ) : (
            <div className="p-6 text-[rgba(220,235,255,0.85)]">Tutorial Videos — TODO</div>
          )}
          {/* Overlay details panel that doesn't shrink center */}
          {/* Removed overlay + edge tab; LiveLayout remains for non-text tabs */}
        </main>
      </div>
    </div>
  );
}
