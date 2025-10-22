"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, User } from 'lucide-react';
import type { DMConversation } from '@/types/live';
import PresenceDot from '@/components/live/indicators/PresenceDot';
import UnreadBadge from '@/components/live/indicators/UnreadBadge';
import StartDMDialog from './StartDMDialog';

interface DMListProps {
  conversations: DMConversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onShowFriends?: () => void;
  onStartDM?: (userId: string) => void;
  collapsed?: boolean;
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

export default function DMList({ 
  conversations, 
  activeConversationId, 
  onSelectConversation, 
  onShowFriends,
  onStartDM,
  collapsed = false 
}: DMListProps) {
  const [showStartDialog, setShowStartDialog] = useState(false);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="px-2">
      <div className="px-2 py-1 text-[13px] text-[rgba(220,235,255,0.65)] flex items-center justify-between">
        {!collapsed ? (
          <>
            <span>Direct Messages</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onShowFriends?.()}
                className="text-[rgba(220,235,255,0.4)] hover:text-[rgba(220,235,255,0.8)] transition-colors p-1 rounded hover:bg-white/5"
                title="Show friends list"
                aria-label="Show friends list"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowStartDialog(true)}
                className="text-[rgba(220,235,255,0.4)] hover:text-[rgba(220,235,255,0.8)] transition-colors p-1 rounded hover:bg-white/5"
                title="Start a new DM"
                aria-label="Start a new direct message"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center w-full">
            <button
              onClick={() => onShowFriends?.()}
              className="p-1 rounded hover:bg-white/5 transition-colors"
              title="Direct Messages"
              aria-label="Direct Messages"
            >
              <User className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        {conversations.length === 0 && !collapsed ? (
          <div className="px-2 py-3 text-center">
            <div className="text-xs text-[rgba(220,235,255,0.5)] mb-2">No conversations yet</div>
            <button
              onClick={() => setShowStartDialog(true)}
              className="text-xs text-[rgba(220,235,255,0.7)] hover:text-[rgba(220,235,255,0.9)] transition-colors underline"
            >
              Start a conversation
            </button>
          </div>
        ) : conversations.length === 0 && collapsed ? (
          <div className="px-2 py-2 text-center">
            <button
              onClick={() => setShowStartDialog(true)}
              className="w-full p-2 rounded hover:bg-white/5 transition-colors"
              title="Start a DM"
            >
              <Plus className="w-4 h-4 mx-auto text-[rgba(220,235,255,0.7)]" />
            </button>
          </div>
        ) : (
          conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-white/5 transition-colors group ${
              activeConversationId === conversation.id ? 'bg-white/10' : ''
            }`}
            title={collapsed ? conversation.otherUser.name : undefined}
          >
            {/* Avatar with presence indicator */}
            <div className="relative flex-shrink-0">
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

            {!collapsed && (
              <>
                {/* User info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[rgba(236,245,255,0.95)] truncate">
                      {conversation.otherUser.name}
                    </span>
                    {conversation.lastMessage && (
                      <span className="text-xs text-[rgba(220,235,255,0.5)] flex-shrink-0">
                        {formatTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <div className="text-sm text-[rgba(220,235,255,0.7)] truncate">
                      {conversation.lastMessage.senderId === conversation.otherUser.id ? '' : 'You: '}
                      {conversation.lastMessage.content}
                    </div>
                  )}
                </div>

                {/* Unread badge */}
                {conversation.unreadCount > 0 && (
                  <UnreadBadge count={conversation.unreadCount} type="dm" />
                )}
              </>
            )}
          </button>
          ))
        )}
      </div>

      <StartDMDialog 
        open={showStartDialog} 
        onClose={() => setShowStartDialog(false)}
        onStartDM={(userId) => {
          onStartDM?.(userId);
          setShowStartDialog(false);
        }}
      />
    </div>
  );
}
