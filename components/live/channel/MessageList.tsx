"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import type { LiveMessage } from '@/types/live';
import MessageItem from '@/components/live/channel/MessageItem';

export default function MessageList({ messages, className = '', channelId, onUnsendMessage }: { messages: LiveMessage[]; className?: string; channelId?: string; onUnsendMessage?: (messageId: string) => void }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(new Set());
  const [readTimeouts, setReadTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

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

  // Mark messages as read when they've been visible for 1 second
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!channelId || messageIds.length === 0) return;

    try {
      const response = await fetch(`/api/live/messages/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageIds, channelId }),
      });

      if (response.ok) {

      }
    } catch (error) {
      console.error('Failed to mark channel messages as read:', error);
    }
  }, [channelId]);

  // Intersection Observer for scroll-based read tracking
  useEffect(() => {
    if (!channelId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const messageId = entry.target.getAttribute('data-message-id');
          if (!messageId) return;

          if (entry.isIntersecting) {
            // Message is visible, start 1-second timer
            const timeout = setTimeout(() => {
              markMessagesAsRead([messageId]);
              setVisibleMessages(prev => new Set(prev).add(messageId));
            }, 1000);

            setReadTimeouts(prev => new Map(prev).set(messageId, timeout));
          } else {
            // Message is no longer visible, clear timeout
            const timeout = readTimeouts.get(messageId);
            if (timeout) {
              clearTimeout(timeout);
              setReadTimeouts(prev => {
                const newMap = new Map(prev);
                newMap.delete(messageId);
                return newMap;
              });
            }
          }
        });
      },
      {
        threshold: 0.5, // Message must be 50% visible
        rootMargin: '0px 0px -10% 0px', // Trigger when message is 10% from bottom
      }
    );

    // Observe all message elements
    messageRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      // Clear all timeouts
      readTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [channelId, messages, markMessagesAsRead, readTimeouts]);

  return (
    <div ref={containerRef} className={`flex-1 overflow-y-auto px-6 py-4 space-y-4 ${className}`}>
      {messages.map((m, i) => (
        <MessageItem
          key={m.id}
          ref={(el) => {
            if (el) {
              messageRefs.current.set(m.id, el);
            }
          }}
          msg={m}
          showDivider={i > 0 && shouldShowSoftDivider(messages[i-1], m)}
          onUnsendMessage={onUnsendMessage}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function shouldShowSoftDivider(prev: LiveMessage, curr: LiveMessage) {
  const pd = new Date(prev.createdAt); const cd = new Date(curr.createdAt);
  return pd.toDateString() !== cd.toDateString();
}
