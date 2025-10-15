"use client";
import { useEffect, useRef } from 'react';
import type { LiveMessage } from '@/types/live';
import MessageItem from '@/components/live/channel/MessageItem';

export default function MessageList({ messages, className = '' }: { messages: LiveMessage[]; className?: string }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Only auto-scroll if user is near the bottom (within 100px)
    const container = containerRef.current;
    const bottom = bottomRef.current;
    if (!container || !bottom) return;
    
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      bottom.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  return (
    <div ref={containerRef} className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 ${className}`}>
      {messages.map((m, i) => (
        <MessageItem key={m.id} msg={m} showDivider={i > 0 && shouldShowSoftDivider(messages[i-1], m)} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function shouldShowSoftDivider(prev: LiveMessage, curr: LiveMessage) {
  const pd = new Date(prev.createdAt); const cd = new Date(curr.createdAt);
  return pd.toDateString() !== cd.toDateString();
}
