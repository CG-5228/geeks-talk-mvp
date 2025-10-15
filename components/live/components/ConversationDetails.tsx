"use client";
import { X } from 'lucide-react';
import type { Channel } from '@/types/live';

export default function ConversationDetails({ conversation, onClose }: { conversation: Channel | null; onClose?: () => void }) {
  if (!conversation) return (
    <div className="h-full bg-[linear-gradient(180deg,var(--surface-2),var(--surface-1))] text-[rgba(220,235,255,0.75)] p-4">
      No channel selected.
    </div>
  );
  return (
    <div className="h-full bg-[linear-gradient(180deg,var(--surface-2),var(--surface-1))] text-[rgba(236,245,255,0.95)]">
      <div className="p-4 border-b border-border/20 flex items-center justify-between">
        <h3 className="text-base font-semibold">Details</h3>
        <button
          onClick={() => onClose?.()}
          className="p-1 rounded hover:bg-white/10 text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
          title="Close panel"
          aria-label="Close details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="text-xs text-[rgba(220,235,255,0.7)]">Channel</div>
          <div className="text-lg font-semibold">#{conversation.name}</div>
        </div>
        {conversation.topic && (
          <div>
            <div className="text-xs text-[rgba(220,235,255,0.7)]">Topic</div>
            <div className="text-sm text-[rgba(220,235,255,0.9)]">{conversation.topic}</div>
          </div>
        )}
        {/* tabs/content placeholders for Members / Media / Files */}
        <div className="text-sm text-[rgba(220,235,255,0.7)]">Members · Media · Files (coming soon)</div>
      </div>
    </div>
  );
}
