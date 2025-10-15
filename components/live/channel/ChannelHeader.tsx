"use client";
import type { Channel } from '@/types/live';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';

export default function ChannelHeader({ channel, onToggleDetails, detailsOpen }: { channel: Channel | null; onToggleDetails?: () => void; detailsOpen?: boolean }) {
  return (
    <div className="sticky top-0 z-20 h-12 px-4 backdrop-blur-md border-b border-border/20 flex items-center">
      {channel ? (
        <div className="flex items-center gap-3 w-full">
          <div className="text-sm font-semibold text-[rgba(236,245,255,0.95)]">#{channel.name}</div>
          {channel.topic && <div className="text-xs text-[rgba(220,235,255,0.75)]">{channel.topic}</div>}
          <div className="ml-auto flex items-center gap-1">
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
      ) : (
        <div className="text-[rgba(220,235,255,0.8)]">Select a channel</div>
      )}
    </div>
  );
}
