"use client";
import type { Channel, LiveMessage } from '@/types/live';
import ChannelHeader from '@/components/live/channel/ChannelHeader';
import MessageList from '@/components/live/channel/MessageList';
import MessageSkeleton from '@/components/live/channel/MessageSkeleton';
import { Hash, MessageCirclePlus, Plus, Sparkles } from 'lucide-react';

export default function Conversation({
  channel,
  messages,
  onToggleDetails,
  detailsOpen,
  onUnsendMessage,
  onReplyMessage,
  onEditMessage,
  onTogglePin,
  onOpenThread,
  onOpenPins,
  onOpenSearch,
  canPin,
  pinnedCount,
  onLoadOlder,
  hasMoreBefore,
  loadingOlder,
  currentUserId,
  initialLoading,
  onOpenCreateChannel,
}: {
  channel: Channel | null;
  messages: LiveMessage[];
  onToggleDetails?: () => void;
  detailsOpen?: boolean;
  onUnsendMessage?: (messageId: string) => void;
  onReplyMessage?: (message: { id: string; content: string; authorName: string; authorImage?: string | null }) => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void> | void;
  onTogglePin?: (messageId: string, currentlyPinned: boolean) => void;
  onOpenThread?: (messageId: string) => void;
  onOpenPins?: () => void;
  onOpenSearch?: () => void;
  canPin?: boolean;
  pinnedCount?: number;
  onLoadOlder?: () => Promise<void> | void;
  hasMoreBefore?: boolean;
  loadingOlder?: boolean;
  currentUserId?: string | null;
  initialLoading?: boolean;
  onOpenCreateChannel?: () => void;
}) {
  return (
    <section className="min-w-0 flex flex-col h-full bg-[color:var(--nav-bg)]/30 backdrop-blur-xl rounded-lg">
      <ChannelHeader
        channel={channel}
        onToggleDetails={onToggleDetails}
        detailsOpen={detailsOpen}
        onOpenPins={onOpenPins}
        onOpenSearch={onOpenSearch}
        pinnedCount={pinnedCount}
      />
      {channel ? (
        <div className="relative flex flex-col flex-1 min-h-0">
          {initialLoading ? (
            <MessageSkeleton count={6} />
          ) : messages.length === 0 ? (
            <EmptyChannelState channel={channel} />
          ) : (
            <MessageList
              messages={messages}
              channelId={channel.id}
              onUnsendMessage={onUnsendMessage}
              onReplyMessage={onReplyMessage}
              onEditMessage={onEditMessage}
              onTogglePin={onTogglePin}
              onOpenThread={onOpenThread}
              canPin={canPin}
              onLoadOlder={onLoadOlder}
              hasMoreBefore={hasMoreBefore}
              loadingOlder={loadingOlder}
              currentUserId={currentUserId}
            />
          )}
        </div>
      ) : (
        <NoChannelState onOpenCreateChannel={onOpenCreateChannel} />
      )}
    </section>
  );
}

function EmptyChannelState({ channel }: { channel: Channel }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-[color:hsl(var(--primary)/0.15)] ring-1 ring-[color:hsl(var(--primary)/0.35)] grid place-items-center text-[color:hsl(var(--primary))]">
        <Hash className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[rgba(236,245,255,0.95)]">
        Welcome to #{channel.name}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-[rgba(220,235,255,0.7)]">
        {channel.topic?.trim()
          ? channel.topic
          : 'This is the start of the conversation. Say hello or share what you’re working on — your message will be the first one here.'}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[rgba(220,235,255,0.6)]">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
          <Sparkles className="h-3 w-3" /> Type
          <kbd className="font-mono font-semibold text-[rgba(236,245,255,0.85)]">/</kbd>
          for commands
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
          <MessageCirclePlus className="h-3 w-3" /> Use
          <kbd className="font-mono font-semibold text-[rgba(236,245,255,0.85)]">@</kbd>
          to mention teammates
        </span>
      </div>
    </div>
  );
}

function NoChannelState({ onOpenCreateChannel }: { onOpenCreateChannel?: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.1] grid place-items-center text-[rgba(220,235,255,0.7)]">
        <Hash className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[rgba(236,245,255,0.95)]">Pick a channel to get started</h3>
      <p className="mt-1.5 max-w-md text-sm text-[rgba(220,235,255,0.65)]">
        Channels are where conversations happen. Choose one from the sidebar, or spin up a private space of your own.
      </p>
      {onOpenCreateChannel && (
        <button
          type="button"
          onClick={onOpenCreateChannel}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[color:hsl(var(--primary))] px-3.5 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[0_0_18px_hsl(var(--primary)/0.35)] hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Create a channel
        </button>
      )}
    </div>
  );
}
