"use client";

import { useEffect, useRef } from 'react';
import MessageItem from '@/components/live/chat/MessageItem';
import type { LiveMessage } from '@/types/live';

export default function MessageList({ messages }: { messages: LiveMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {messages.map((m) => (
        <MessageItem key={m.id} msg={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
