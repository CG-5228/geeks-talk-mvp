"use client";
import { useState, useEffect, useRef } from 'react';
import { X, Search, User } from 'lucide-react';
import Image from 'next/image';
import PresenceDot from '@/components/live/indicators/PresenceDot';

interface User {
  id: string;
  name: string;
  username: string;
  image: string | null;
  onlineStatus: 'online' | 'offline' | 'away';
  lastSeen: string | null;
}

interface StartDMDialogProps {
  open: boolean;
  onClose: () => void;
  onStartDM: (userId: string) => void;
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

export default function StartDMDialog({ open, onClose, onStartDM }: StartDMDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/live/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [searchQuery]);

  const handleStartDM = () => {
    if (selectedUser) {
      console.log('Starting DM with user from dialog:', selectedUser.id, selectedUser.name);
      onStartDM(selectedUser.id);
      handleClose(); // Close the dialog after starting DM
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setUsers([]);
    setSelectedUser(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[color:var(--card-bg)] rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <h2 className="text-lg font-semibold text-[rgba(236,245,255,0.95)]">
            Start a Direct Message
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-white/10 text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.5)]" />
            <input
              type="text"
              placeholder="Search for a user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-border/20 rounded-lg text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-[rgba(220,235,255,0.7)] py-4">
              Searching...
            </div>
          ) : users.length === 0 && searchQuery.trim().length >= 2 ? (
            <div className="text-center text-[rgba(220,235,255,0.7)] py-4">
              No users found
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-[rgba(220,235,255,0.7)] py-4">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Search for a user to start a conversation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-primary/20 border border-primary/40'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="relative">
                    <Image
                      src={user.image || DEFAULT_AVATAR}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                      unoptimized={!user.image}
                    />
                    <PresenceDot 
                      status={user.onlineStatus} 
                      size="sm"
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-[rgba(236,245,255,0.95)]">
                      {user.name}
                    </div>
                    <div className="text-sm text-[rgba(220,235,255,0.7)]">
                      @{user.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/20 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-[rgba(220,235,255,0.8)] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStartDM}
            disabled={!selectedUser}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start DM
          </button>
        </div>
      </div>
    </div>
  );
}
