"use client";
import { useState } from 'react';
import { X, Users, File } from 'lucide-react';
import type { Channel } from '@/types/live';
import MembersTab from '../details/MembersTab';
import FilesTab from '../details/FilesTab';

export default function ConversationDetails({ conversation, onClose }: { conversation: Channel | null; onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<'members' | 'files'>('members');

  if (!conversation) return (
    <div className="h-full bg-[linear-gradient(180deg,var(--surface-2),var(--surface-1))] text-[rgba(220,235,255,0.75)] p-4">
      No channel selected.
    </div>
  );

  return (
    <div className="h-full bg-[linear-gradient(180deg,var(--surface-2),var(--surface-1))] text-[rgba(236,245,255,0.95)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/20 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Details</h3>
          <div className="text-sm text-[rgba(220,235,255,0.7)]">#{conversation.name}</div>
        </div>
        <button
          onClick={() => onClose?.()}
          className="p-1 rounded hover:bg-white/10 text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
          title="Close panel"
          aria-label="Close details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Channel Info */}
      <div className="p-4 border-b border-border/20">
        {conversation.topic && (
          <div>
            <div className="text-xs text-[rgba(220,235,255,0.7)]">Topic</div>
            <div className="text-sm text-[rgba(220,235,255,0.9)]">{conversation.topic}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'members'
              ? 'text-white border-b-2 border-blue-400 bg-[rgba(255,255,255,0.05)]'
              : 'text-[rgba(220,235,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
          }`}
        >
          <Users className="w-4 h-4" />
          Members
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'files'
              ? 'text-white border-b-2 border-blue-400 bg-[rgba(255,255,255,0.05)]'
              : 'text-[rgba(220,235,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
          }`}
        >
          <File className="w-4 h-4" />
          Files
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'members' && (
          <MembersTab channelId={conversation.id} />
        )}
        {activeTab === 'files' && (
          <FilesTab channelId={conversation.id} />
        )}
      </div>
    </div>
  );
}
