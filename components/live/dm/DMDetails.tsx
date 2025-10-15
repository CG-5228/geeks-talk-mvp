"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, Plus, User, X } from 'lucide-react';
import type { DMConversation } from '@/types/live';
import PresenceDot from '@/components/live/indicators/PresenceDot';
import StartDMDialog from './StartDMDialog';

interface User {
  id: string;
  name: string;
  username: string;
  image: string | null;
  onlineStatus: 'online' | 'offline' | 'away';
  lastSeen: string | null;
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

export default function DMDetails({ 
  conversation, 
  onClose, 
  onStartDM 
}: { 
  conversation: DMConversation | null; 
  onClose?: () => void;
  onStartDM?: (userId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);

  // Load users for friends list
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/live/users/search?q=');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!conversation) {
    return (
      <div className="h-full bg-[linear-gradient(180deg,var(--surface-2),var(--surface-1))] text-[rgba(236,245,255,0.95)]">
        <div className="p-4 border-b border-border/20 flex items-center justify-between">
          <h3 className="text-base font-semibold">Direct Messages</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowStartDialog(true)}
              className="p-1 rounded hover:bg-white/10 text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
              title="Start new DM"
              aria-label="Start new direct message"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onClose?.()}
              className="p-1 rounded hover:bg-white/10 text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
              title="Close panel"
              aria-label="Close direct messages panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.5)]" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-border/20 rounded text-sm text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-sm text-[rgba(220,235,255,0.7)] mb-3">All Users</div>
          {loading ? (
            <div className="text-center text-[rgba(220,235,255,0.7)] py-4">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-[rgba(220,235,255,0.7)] py-4">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    console.log('Starting DM with user:', user.id, user.name);
                    onStartDM?.(user.id);
                    // Close the details panel after starting DM
                    onClose?.();
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors group"
                >
                  <div className="relative">
                    <Image
                      src={user.image || DEFAULT_AVATAR}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                      unoptimized={!user.image}
                    />
                    <PresenceDot 
                      status={user.onlineStatus} 
                      size="sm"
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-[rgba(236,245,255,0.95)] truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-[rgba(220,235,255,0.7)] truncate">
                      @{user.username}
                    </div>
                  </div>
                  <div className="text-xs text-[rgba(220,235,255,0.5)]">
                    {user.onlineStatus === 'online' ? 'Online' : formatLastSeen(user.lastSeen)}
                  </div>
                </button>
              ))}
            </div>
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

  // Show specific DM conversation details
  return (
    <div className="h-full bg-[linear-gradient(180deg,var(--surface-2),var(--surface-1))] text-[rgba(236,245,255,0.95)]">
      <div className="p-4 border-b border-border/20 flex items-center justify-between">
        <h3 className="text-base font-semibold">DM Details</h3>
        <button
          onClick={() => onClose?.()}
          className="p-1 rounded hover:bg-white/10 text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
          title="Close panel"
          aria-label="Close DM details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Image
              src={conversation.otherUser.image || DEFAULT_AVATAR}
              alt={conversation.otherUser.name}
              width={48}
              height={48}
              className="rounded-full"
              unoptimized={!conversation.otherUser.image}
            />
            <PresenceDot 
              status={conversation.otherUser.onlineStatus} 
              size="md"
              className="absolute -bottom-0.5 -right-0.5"
            />
          </div>
          <div>
            <div className="text-lg font-semibold">{conversation.otherUser.name}</div>
            <div className="text-sm text-[rgba(220,235,255,0.7)]">@{conversation.otherUser.username}</div>
            <div className="text-xs text-[rgba(220,235,255,0.5)]">
              {conversation.otherUser.onlineStatus === 'online' ? 'Online' : 
               conversation.otherUser.onlineStatus === 'away' ? 'Away' : 'Offline'}
            </div>
          </div>
        </div>
        
        {conversation.lastMessage && (
          <div>
            <div className="text-xs text-[rgba(220,235,255,0.7)]">Last Message</div>
            <div className="text-sm text-[rgba(220,235,255,0.9)] bg-white/5 p-2 rounded">
              {conversation.lastMessage.content}
            </div>
            <div className="text-xs text-[rgba(220,235,255,0.5)] mt-1">
              {new Date(conversation.lastMessage.createdAt).toLocaleString()}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs text-[rgba(220,235,255,0.7)]">Unread Messages</div>
          <div className="text-lg font-semibold text-primary">
            {conversation.unreadCount}
          </div>
        </div>
      </div>
    </div>
  );
}
