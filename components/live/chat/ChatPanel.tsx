"use client";
import ChatHeader from '@/components/live/chat/ChatHeader';
import MessageList from '@/components/live/chat/MessageList';
import ChatComposer from '@/components/live/chat/ChatComposer';
import type { Channel, LiveMessage } from '@/types/live';

export default function ChatPanel({ channel, messages, onSend, onToggleDetails }: {
  channel: Channel | null;
  messages: LiveMessage[];
  onSend: (text: string) => void;
  onToggleDetails: () => void;
}) {
  return (
    <section className="min-w-0 flex flex-col">
      <ChatHeader channel={channel} />
      <MessageList messages={messages} />
      <div className="flex items-center justify-between border-t border-[color:var(--nav-border)]/20">
        <ChatComposer onSend={onSend} disabled={!channel} />
        <button onClick={onToggleDetails} className="mx-3 my-2 text-xs rounded px-2 py-1 bg-white/5 hover:bg-white/10 ring-1 ring-[color:var(--nav-border)]/20">Details</button>
      </div>
    </section>
  );
}
