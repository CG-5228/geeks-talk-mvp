"use client";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';
import type { DMConversation } from '@/types/live';
import PresenceDot from '@/components/live/indicators/PresenceDot';
import TypingIndicator from '@/components/live/indicators/TypingIndicator';
import MessageInput from '@/components/live/channel/MessageInput';

interface DMMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  };
  receiver: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  };
}

interface DMConversationProps {
  conversation: DMConversation | null;
  messages: DMMessage[];
  onToggleDetails?: () => void;
  detailsOpen?: boolean;
  onSendMessage?: (content: string) => void;
  typingUsers?: Array<{ id: string; name: string }>;
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

export default function DMConversation({ 
  conversation, 
  messages, 
  onToggleDetails, 
  detailsOpen,
  onSendMessage,
  typingUsers = []
}: DMConversationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (conversation && conversation.unreadCount > 0) {
      // TODO: Call API to mark messages as read
      fetch(`/api/live/dms/${conversation.id}`, { method: 'PATCH' }).catch(console.error);
    }
  }, [conversation]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  if (!conversation) {
    return (
      <section className="min-w-0 flex flex-col h-full bg-[color:var(--nav-bg)]/30 backdrop-blur-xl">
        <div className="h-12 px-4 backdrop-blur-md border-b border-border/20 flex items-center">
          <div className="text-[rgba(220,235,255,0.8)]">Select a conversation</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-[rgba(220,235,255,0.7)]">
            <p>Choose a conversation to start messaging</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 flex flex-col h-full bg-[color:var(--nav-bg)]/30 backdrop-blur-xl">
      {/* Header */}
      <div className="h-12 px-4 backdrop-blur-md border-b border-border/20 flex items-center">
        <div className="flex items-center gap-3 w-full">
          <div className="relative">
            <Image
              src={conversation.otherUser.image || DEFAULT_AVATAR}
              alt={conversation.otherUser.name}
              width={32}
              height={32}
              className="rounded-full"
              unoptimized={!conversation.otherUser.image}
            />
            <PresenceDot 
              status={conversation.otherUser.onlineStatus} 
              size="sm"
              className="absolute -bottom-0.5 -right-0.5"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[rgba(236,245,255,0.95)]">
              {conversation.otherUser.name}
            </div>
            <div className="text-xs text-[rgba(220,235,255,0.7)]">
              {conversation.otherUser.onlineStatus === 'online' ? 'Online' : 
               conversation.otherUser.onlineStatus === 'away' ? 'Away' : 'Offline'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleDetails?.()}
              aria-label={detailsOpen ? 'Hide details' : 'Show details'}
              title={detailsOpen ? 'Hide details' : 'Show details'}
              className="size-8 rounded-md hover:bg-white/5 ring-1 ring-transparent hover:ring-border/20 grid place-items-center"
            >
              {detailsOpen ? (
                <PanelRightClose className="w-4 h-4 text-[rgba(236,245,255,0.9)]" />
              ) : (
                <PanelRightOpen className="w-4 h-4 text-[rgba(236,245,255,0.9)]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((message, index) => {
          const showDate = index === 0 || 
            new Date(message.createdAt).toDateString() !== 
            new Date(messages[index - 1].createdAt).toDateString();

          return (
            <div key={message.id}>
              {showDate && (
                <div className="text-center py-4">
                  <div className="text-xs text-[rgba(220,235,255,0.5)] bg-[color:var(--nav-bg)]/50 px-3 py-1 rounded-full inline-block">
                    {formatDate(message.createdAt)}
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3 group">
                <Image
                  src={message.sender.image || DEFAULT_AVATAR}
                  alt={message.sender.name}
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                  unoptimized={!message.sender.image}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[rgba(236,245,255,0.95)]">
                      {message.sender.name}
                    </span>
                    <span className="text-xs text-[rgba(220,235,255,0.7)]">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <div className="text-[rgba(220,235,255,0.9)] whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {onSendMessage && (
        <MessageInput onSendMessage={onSendMessage} />
      )}
    </section>
  );
}
