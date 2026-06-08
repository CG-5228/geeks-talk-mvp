"use client";
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, MessagesSquare, Send } from 'lucide-react';
import { useSession } from 'next-auth/react';
import type { LiveMessage } from '@/types/live';

interface ThreadPanelProps {
  rootMessageId: string;
  channelId: string;
  onClose: () => void;
  onJumpToRoot: (messageId: string) => void;
  onMessageSent: (msg: LiveMessage) => void;
}

const DEFAULT_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"%3E%3Ccircle cx="14" cy="14" r="14" fill="%23334155"/%3E%3C/svg%3E';

export default function ThreadPanel({
  rootMessageId,
  channelId,
  onClose,
  onJumpToRoot,
  onMessageSent,
}: ThreadPanelProps) {
  const { data: session } = useSession();
  const [root, setRoot] = useState<LiveMessage | null>(null);
  const [replies, setReplies] = useState<LiveMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/live/messages/${encodeURIComponent(rootMessageId)}/thread`);
      if (!res.ok) return;
      const data = await res.json();
      setRoot(data.root as LiveMessage);
      setReplies((data.replies as LiveMessage[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootMessageId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const optimistic: LiveMessage = {
      id: `tmp-thr-${Math.random().toString(36).slice(2)}`,
      channelId,
      authorId: session?.user?.id || 'unknown',
      authorName: session?.user?.name || 'You',
      authorImage: session?.user?.image || null,
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
      replyToId: rootMessageId,
      replyTo: root
        ? { id: root.id, content: root.content, authorName: root.authorName, authorImage: root.authorImage }
        : null,
    };
    setReplies((prev) => [...prev, optimistic]);
    setText('');
    try {
      const res = await fetch('/api/live/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, content, replyToId: rootMessageId }),
      });
      if (res.ok) {
        const created = (await res.json()) as LiveMessage;
        setReplies((prev) => prev.map((m) => (m.id === optimistic.id ? created : m)));
        onMessageSent(created);
      } else {
        setReplies((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...m, content: `${m.content} (failed)` } : m))
        );
      }
    } catch {
      setReplies((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, content: `${m.content} (failed)` } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const renderMsg = (m: LiveMessage, compact = false) => {
    const plain = m.content.replace(/📎\s+.+/g, '').trim();
    return (
      <div className="flex items-start gap-2.5">
        <Image
          src={m.authorImage || DEFAULT_AVATAR}
          alt={m.authorName}
          width={compact ? 24 : 28}
          height={compact ? 24 : 28}
          className="rounded-full flex-shrink-0"
          unoptimized={!m.authorImage}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[rgba(236,245,255,0.95)]">{m.authorName}</span>
            <span className="text-[10px] text-[rgba(220,235,255,0.55)]">
              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {m.editedAt && (
              <span className="text-[10px] text-[rgba(220,235,255,0.5)] italic">(edited)</span>
            )}
          </div>
          <div className="text-sm text-[rgba(236,245,255,0.88)] whitespace-pre-wrap break-words">
            {plain || '(attachment)'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      role="dialog"
      aria-label="Thread"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 h-full w-full max-w-md bg-[color:var(--nav-bg)]/95 backdrop-blur-xl border-l border-border/30 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 px-4 flex items-center gap-3 border-b border-border/20">
          <MessagesSquare className="w-4 h-4 text-[color:hsl(var(--primary))]" />
          <div className="text-sm font-semibold text-[rgba(236,245,255,0.95)]">Thread</div>
          <button
            onClick={onClose}
            aria-label="Close thread"
            className="ml-auto size-8 rounded-md hover:bg-white/5 grid place-items-center"
          >
            <X className="w-4 h-4 text-[rgba(236,245,255,0.9)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-sm text-[rgba(220,235,255,0.7)]">Loading…</div>
          ) : root ? (
            <>
              <div
                className="rounded-lg border border-white/10 bg-black/20 p-3 cursor-pointer hover:bg-black/30 transition-colors"
                onClick={() => onJumpToRoot(root.id)}
                role="button"
                aria-label="Jump to original message"
              >
                {renderMsg(root)}
              </div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[rgba(220,235,255,0.5)]">
                <div className="flex-1 h-px bg-white/[0.06]" />
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              {replies.map((r) => (
                <div key={r.id}>{renderMsg(r, true)}</div>
              ))}
              <div ref={bottomRef} />
            </>
          ) : (
            <div className="text-sm text-[rgba(220,235,255,0.7)]">Thread not found.</div>
          )}
        </div>

        <div className="p-3 border-t border-border/20">
          <div className="flex items-end gap-2 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Reply in thread…"
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none text-sm text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.45)] max-h-32"
              aria-label="Reply in thread"
            />
            <button
              type="button"
              disabled={sending || !text.trim()}
              onClick={send}
              aria-label="Send reply"
              className="size-8 rounded-lg bg-[color:hsl(var(--primary))] text-[hsl(var(--primary-foreground))] grid place-items-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
