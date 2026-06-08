"use client";
import type { Channel } from '@/types/live';
import { PanelRightOpen, PanelRightClose, Pin, Search, Command } from 'lucide-react';

export default function ChannelHeader({
  channel,
  onToggleDetails,
  detailsOpen,
  onOpenPins,
  onOpenSearch,
  pinnedCount,
}: {
  channel: Channel | null;
  onToggleDetails?: () => void;
  detailsOpen?: boolean;
  onOpenPins?: () => void;
  onOpenSearch?: () => void;
  pinnedCount?: number;
}) {
  return (
    <div className="sticky top-0 z-20 h-12 px-4 backdrop-blur-md border-b border-border/20 flex items-center">
      {channel ? (
        <div className="flex items-center gap-3 w-full">
          <div className="text-sm font-semibold text-[rgba(236,245,255,0.95)]">#{channel.name}</div>
          {channel.topic && <div className="text-xs text-[rgba(220,235,255,0.75)]">{channel.topic}</div>}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('chat:open-palette'))}
              aria-label="Quick switcher"
              title="Quick switcher (⌘K)"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-2 h-8 hover:bg-white/5 ring-1 ring-border/15 hover:ring-border/30 text-xs text-[rgba(220,235,255,0.8)]"
            >
              <Command className="w-3.5 h-3.5" />
              <kbd className="font-mono text-[10px] tracking-wide">K</kbd>
            </button>
            {onOpenSearch && (
              <button
                onClick={() => onOpenSearch()}
                aria-label="Search messages"
                title="Search messages"
                className="size-8 rounded-md hover:bg-white/5 ring-1 ring-transparent hover:ring-border/20 grid place-items-center"
              >
                <Search className="w-4 h-4 text-[rgba(236,245,255,0.9)]" />
              </button>
            )}
            {onOpenPins && (
              <button
                onClick={() => onOpenPins()}
                aria-label={pinnedCount ? `View ${pinnedCount} pinned message${pinnedCount === 1 ? '' : 's'}` : 'View pinned messages'}
                title="Pinned messages"
                className="relative size-8 rounded-md hover:bg-white/5 ring-1 ring-transparent hover:ring-border/20 grid place-items-center"
              >
                <Pin className="w-4 h-4 text-[rgba(236,245,255,0.9)]" />
                {pinnedCount ? (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[color:hsl(var(--primary))] text-[9px] font-bold text-[hsl(var(--primary-foreground))] grid place-items-center">
                    {pinnedCount > 9 ? '9+' : pinnedCount}
                  </span>
                ) : null}
              </button>
            )}
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
