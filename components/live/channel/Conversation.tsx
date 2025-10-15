"use client";
import type { Channel, LiveMessage } from '@/types/live';
import ChannelHeader from '@/components/live/channel/ChannelHeader';
import MessageList from '@/components/live/channel/MessageList';

export default function Conversation({ channel, messages, onToggleDetails, detailsOpen }: {
  channel: Channel | null;
  messages: LiveMessage[];
  onToggleDetails?: () => void;
  detailsOpen?: boolean;
}) {
  return (
    <section className="min-w-0 flex flex-col h-full bg-[color:var(--nav-bg)]/30 backdrop-blur-xl">
      <ChannelHeader channel={channel} onToggleDetails={onToggleDetails} detailsOpen={detailsOpen} />
      {channel ? (
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <MessageList messages={messages} />
        </div>
      ) : (
        <div className="p-6 text-[rgba(220,235,255,0.8)]">No channel selected.</div>
      )}
    </section>
  );
}
