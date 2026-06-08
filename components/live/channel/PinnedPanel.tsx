"use client";
import { useEffect, useState } from 'react';
import { X, Pin } from 'lucide-react';
import type { LiveMessage } from '@/types/live';

interface PinnedPanelProps {
  channelId: string;
  refreshKey: number;
  onClose: () => void;
  onJumpTo: (messageId: string) => void;
  canUnpin: boolean;
  onUnpin: (messageId: string) => void;
}

export default function PinnedPanel({
  channelId,
  refreshKey,
  onClose,
  onJumpTo,
  canUnpin,
  onUnpin,
}: PinnedPanelProps) {
  const [items, setItems] = useState<LiveMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/live/channels/${encodeURIComponent(channelId)}/pins`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data) => {
        if (!cancelled) setItems((data.messages as LiveMessage[]) || []);
      })
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [channelId, refreshKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      role="dialog"
      aria-label="Pinned messages"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 h-full w-full max-w-md bg-[color:var(--nav-bg)]/95 backdrop-blur-xl border-l border-border/30 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 px-4 flex items-center gap-3 border-b border-border/20">
          <Pin className="w-4 h-4 text-[color:hsl(var(--primary))]" />
          <div className="text-sm font-semibold text-[rgba(236,245,255,0.95)]">Pinned messages</div>
          <button
            onClick={onClose}
            aria-label="Close pinned panel"
            className="ml-auto size-8 rounded-md hover:bg-white/5 grid place-items-center"
          >
            <X className="w-4 h-4 text-[rgba(236,245,255,0.9)]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-sm text-[rgba(220,235,255,0.7)] p-4">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-[rgba(220,235,255,0.7)] p-4">
              No pinned messages yet. Pin important messages to keep them easy to find.
            </div>
          ) : (
            items.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-white/10 bg-black/20 hover:bg-black/30 p-3 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[rgba(236,245,255,0.9)]">{m.authorName}</span>
                  <span className="text-[10px] text-[rgba(220,235,255,0.6)]">
                    {new Date(m.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-sm text-[rgba(236,245,255,0.85)] whitespace-pre-wrap break-words line-clamp-4">
                  {m.content.replace(/📎\s+.+/g, '').trim() || '(attachment)'}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onJumpTo(m.id);
                      onClose();
                    }}
                    className="text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[rgba(220,235,255,0.9)]"
                  >
                    Jump to message
                  </button>
                  {canUnpin && (
                    <button
                      type="button"
                      onClick={() => onUnpin(m.id)}
                      className="text-xs px-2 py-1 rounded-md text-red-300 hover:bg-red-500/10"
                    >
                      Unpin
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
