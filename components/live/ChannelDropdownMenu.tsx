"use client";

import { useState, useEffect, useRef } from 'react';
import { Trash2, Settings, Copy, Hash, MoreVertical } from 'lucide-react';

interface ChannelDropdownMenuProps {
  channelId: string;
  channelName: string;
  isOwner: boolean;
  onDeleteChannel: (channelId: string) => void;
  onEditChannel?: (channelId: string) => void;
}

export default function ChannelDropdownMenu({
  channelId,
  channelName,
  isOwner,
  onDeleteChannel,
  onEditChannel,
}: ChannelDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the channel #${channelName}? This action cannot be undone.`)) {
      onDeleteChannel(channelId);
      setIsOpen(false);
    }
  };

  const handleCopyChannelId = () => {
    navigator.clipboard.writeText(channelId);
    setIsOpen(false);
  };

  const handleEdit = () => {
    onEditChannel?.(channelId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Three-dot button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-white/10 text-[rgba(220,235,255,0.5)] hover:text-[rgba(220,235,255,0.8)] transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Channel options"
        title="Channel options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-8 z-[100] bg-[color:var(--nav-bg)]/95 backdrop-blur-2xl rounded-lg shadow-lg border border-border/20 py-1 text-sm text-foreground min-w-[160px]"
        >
          {/* Channel Info Header */}
          <div className="px-3 py-2 border-b border-border/20">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
              <span className="font-medium text-[rgba(236,245,255,0.95)]">#{channelName}</span>
            </div>
          </div>

          {/* Copy Channel ID */}
          <button
            onClick={handleCopyChannelId}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 transition-colors text-[rgba(220,235,255,0.9)]"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Channel ID</span>
          </button>

          {/* Owner-only actions */}
          {isOwner && (
            <>
              {/* Edit Channel */}
              {onEditChannel && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 transition-colors text-[rgba(220,235,255,0.9)]"
                >
                  <Settings className="w-4 h-4" />
                  <span>Edit Channel</span>
                </button>
              )}

              {/* Delete Channel */}
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Channel</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
