"use client";
import { useState } from 'react';
import { X, Users, File, Hash } from 'lucide-react';
import type { Channel } from '@/types/live';
import MembersTab from '../details/MembersTab';
import FilesTab from '../details/FilesTab';

export default function ConversationDetails({ conversation, onClose }: { conversation: Channel | null; onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<'members' | 'files'>('members');

  if (!conversation) return (
    <div className="h-full bg-gradient-to-b from-[#1a1b23] to-[#0f1013] text-[rgba(220,235,255,0.6)] flex items-center justify-center p-4">
      <div className="text-center">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Select a channel to view details</p>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-gradient-to-b from-[#1a1b23] via-[#13141a] to-[#0f1013] text-[rgba(236,245,255,0.95)] flex flex-col">
      {/* Enhanced Header */}
      <div className="relative px-5 pt-4 pb-3 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-4 h-4 text-blue-400/60 flex-shrink-0" />
              <h2 className="text-lg font-bold text-white truncate">{conversation.name}</h2>
            </div>
            {conversation.topic && (
              <p className="text-xs text-[rgba(220,235,255,0.5)] line-clamp-2">{conversation.topic}</p>
            )}
          </div>
          <button
            onClick={() => onClose?.()}
            className="p-2 rounded-lg hover:bg-white/10 text-[rgba(220,235,255,0.5)] hover:text-white transition-all duration-200 flex-shrink-0"
            title="Close panel"
            aria-label="Close details panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation - Enhanced */}
      <div className="flex gap-0.5 border-b border-white/5 bg-white/[0.02] px-3">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 relative ${
            activeTab === 'members'
              ? 'text-blue-400'
              : 'text-[rgba(220,235,255,0.6)] hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members</span>
          {activeTab === 'members' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 relative ${
            activeTab === 'files'
              ? 'text-blue-400'
              : 'text-[rgba(220,235,255,0.6)] hover:text-white'
          }`}
        >
          <File className="w-4 h-4" />
          <span>Files</span>
          {activeTab === 'files' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-t-full" />
          )}
        </button>
      </div>

      {/* Tab Content - Optimized with smooth transitions */}
      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 transition-all duration-300 ${
          activeTab === 'members' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <MembersTab channelId={conversation.id} />
        </div>
        <div className={`absolute inset-0 transition-all duration-300 ${
          activeTab === 'files' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <FilesTab channelId={conversation.id} />
        </div>
      </div>
    </div>
  );
}
