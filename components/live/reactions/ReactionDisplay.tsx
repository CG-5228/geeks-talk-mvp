"use client";
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { ReactionSummary } from '@/types/live';

interface ReactionDisplayProps {
  messageId: string;
  messageType: 'channel' | 'dm';
  isOwnMessage?: boolean;
  reactions?: ReactionSummary[];
}

export default function ReactionDisplay({
  messageId,
  messageType,
  isOwnMessage = false,
  reactions: reactionsProp,
}: ReactionDisplayProps) {
  const { data: session } = useSession();
  const [local, setLocal] = useState<ReactionSummary[]>(reactionsProp ?? []);
  const [hovered, setHovered] = useState<string | null>(null);
  const lastOptimisticAt = useRef<number>(0);

  // Sync with parent when payload changes, except briefly after an optimistic toggle
  // (the server write may not yet be reflected in the polled payload).
  useEffect(() => {
    if (Date.now() - lastOptimisticAt.current < 3000) return;
    setLocal(reactionsProp ?? []);
  }, [reactionsProp]);

  // Optimistic local-state toggle shared by chip clicks and picker events.
  const applyToggle = (emoji: string) => {
    const me = session?.user;
    if (!me?.id) return;
    lastOptimisticAt.current = Date.now();
    setLocal((prev) => {
      const next = prev.map((r) => ({ ...r, users: [...r.users] }));
      const idx = next.findIndex((r) => r.emoji === emoji);
      if (idx >= 0) {
        const mine = next[idx].users.findIndex((u) => u.id === me.id);
        if (mine >= 0) {
          next[idx].users.splice(mine, 1);
          next[idx].count -= 1;
          if (next[idx].count <= 0) next.splice(idx, 1);
        } else {
          next[idx].users.push({ id: me.id, name: me.name ?? 'You', image: me.image ?? null });
          next[idx].count += 1;
        }
      } else {
        next.push({
          emoji,
          count: 1,
          users: [{ id: me.id, name: me.name ?? 'You', image: me.image ?? null }],
        });
      }
      return next;
    });
  };

  // Listen for reactions added via MessageActionMenu's picker so they appear instantly
  // (this component is still mounted even when local is empty — we return null below
  // but hooks continue to run).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ messageId: string; messageType: 'channel' | 'dm'; emoji: string }>).detail;
      if (!detail) return;
      if (detail.messageId !== messageId || detail.messageType !== messageType) return;
      applyToggle(detail.emoji);
    };
    window.addEventListener('chat:reaction-toggle', handler as EventListener);
    return () => window.removeEventListener('chat:reaction-toggle', handler as EventListener);
  }, [messageId, messageType, session?.user?.id]);

  if (local.length === 0) return null;

  const toggle = async (emoji: string) => {
    const me = session?.user;
    if (!me?.id) return;

    applyToggle(emoji);

    try {
      const endpoint =
        messageType === 'channel'
          ? `/api/live/messages/${messageId}/reactions`
          : `/api/live/dms/message/${messageId}/reactions`;
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      // The next poll will reconcile exact state.
    } catch (err) {
      console.error('reaction toggle failed', err);
    }
  };

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {local.map((r) => {
        const mine = r.users.some((u) => u.id === session?.user?.id);
        return (
          <div key={r.emoji} className="relative">
            <button
              onClick={() => toggle(r.emoji)}
              onMouseEnter={() => setHovered(r.emoji)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                mine
                  ? 'bg-[color:hsl(var(--primary)/0.2)] border border-[color:hsl(var(--primary)/0.35)]'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-sm leading-none">{r.emoji}</span>
              <span
                className={`text-xs tabular-nums ${
                  mine ? 'text-[color:hsl(var(--primary))]' : 'text-[rgba(220,235,255,0.7)]'
                }`}
              >
                {r.count}
              </span>
            </button>

            {hovered === r.emoji && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                <div className="bg-black/90 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-white/10 min-w-max">
                  <div className="flex flex-col gap-1">
                    {r.users.slice(0, 10).map((u) => (
                      <div key={u.id} className="flex items-center gap-2">
                        <span className="text-sm">{r.emoji}</span>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    ))}
                    {r.users.length > 10 && (
                      <div className="text-[rgba(220,235,255,0.6)]">and {r.users.length - 10} more…</div>
                    )}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
