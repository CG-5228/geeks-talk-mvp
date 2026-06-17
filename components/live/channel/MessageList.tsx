"use client";
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import type { LiveMessage } from '@/types/live';
import MessageItem from '@/components/live/channel/MessageItem';

interface MessageListProps {
  messages: LiveMessage[];
  className?: string;
  channelId?: string;
  onUnsendMessage?: (messageId: string) => void;
  onReplyMessage?: (message: { id: string; content: string; authorName: string; authorImage?: string | null }) => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void> | void;
  onTogglePin?: (messageId: string, currentlyPinned: boolean) => void;
  onOpenThread?: (messageId: string) => void;
  canPin?: boolean;
  onLoadOlder?: () => Promise<void> | void;
  hasMoreBefore?: boolean;
  loadingOlder?: boolean;
  currentUserId?: string | null;
}

function formatDateChip(d: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: today.getFullYear() === d.getFullYear() ? undefined : 'numeric' });
}

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export default function MessageList({
  messages,
  className = '',
  channelId,
  onUnsendMessage,
  onReplyMessage,
  onEditMessage,
  onTogglePin,
  onOpenThread,
  canPin,
  onLoadOlder,
  hasMoreBefore,
  loadingOlder,
  currentUserId,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevLastIdRef = useRef<string | null>(null);
  const prevLengthRef = useRef(messages.length);
  const pendingAnchorRef = useRef<number | null>(null);
  const loadingLockRef = useRef(false);
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(new Set());
  const [readTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [flashId, setFlashId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [newSinceScrollAway, setNewSinceScrollAway] = useState(0);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);

  // Compute the unread divider once per channel mount based on localStorage.
  // We freeze the first unread id so it doesn't jump around as the user reads.
  useEffect(() => {
    if (!channelId) {
      setFirstUnreadId(null);
      return;
    }
    let lastSeen = 0;
    try {
      const raw = window.localStorage.getItem(`geekstalk:lastSeen:${channelId}`);
      if (raw) lastSeen = Number(raw) || 0;
    } catch {
      lastSeen = 0;
    }
    if (!lastSeen || messages.length === 0) {
      setFirstUnreadId(null);
      return;
    }
    const first = messages.find((m) => {
      if (currentUserId && m.authorId === currentUserId) return false;
      return new Date(m.createdAt).getTime() > lastSeen;
    });
    setFirstUnreadId(first?.id ?? null);
    // Freeze after first compute per channel; hydration on message change is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Persist lastSeen when the user is parked at the bottom so future visits
  // compute the right unread slice.
  useEffect(() => {
    if (!channelId || messages.length === 0 || !isAtBottom) return;
    try {
      const newest = new Date(messages[messages.length - 1].createdAt).getTime();
      const prev = Number(window.localStorage.getItem(`geekstalk:lastSeen:${channelId}`) || '0');
      if (newest > prev) {
        window.localStorage.setItem(`geekstalk:lastSeen:${channelId}`, String(newest));
        window.dispatchEvent(new CustomEvent('chat:lastseen-updated', { detail: { channelId, ts: newest } }));
      }
    } catch {
      // ignore
    }
  }, [channelId, isAtBottom, messages]);

  // Auto-scroll on new tail arrivals; increment counter when scrolled away.
  // Distinguish appends from prepends by comparing last-id, so pagination
  // never triggers an auto-scroll.
  useEffect(() => {
    const container = containerRef.current;
    const bottom = bottomRef.current;
    if (!container || !bottom) {
      prevLengthRef.current = messages.length;
      return;
    }
    if (messages.length === 0) {
      prevLastIdRef.current = null;
      prevLengthRef.current = 0;
      return;
    }
    const lastId = messages[messages.length - 1].id;
    const isTailChanged = prevLastIdRef.current !== null && prevLastIdRef.current !== lastId;
    if (isTailChanged) {
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
      const delta = Math.max(1, messages.length - prevLengthRef.current);
      if (nearBottom) {
        bottom.scrollIntoView({ behavior: 'smooth' });
      } else {
        setNewSinceScrollAway((n) => n + delta);
      }
    }
    prevLastIdRef.current = lastId;
    prevLengthRef.current = messages.length;
  }, [messages]);

  // Restore scroll position after prepending older messages. Runs before paint
  // so the jump is invisible.
  useLayoutEffect(() => {
    if (pendingAnchorRef.current === null) return;
    const container = containerRef.current;
    if (!container) {
      pendingAnchorRef.current = null;
      return;
    }
    const delta = container.scrollHeight - pendingAnchorRef.current;
    if (delta > 0) container.scrollTop = delta;
    pendingAnchorRef.current = null;
    loadingLockRef.current = false;
  }, [messages.length]);

  // Reset counters when switching channels and jump to bottom so we don't land
  // at the top of a new room.
  useEffect(() => {
    setNewSinceScrollAway(0);
    prevLengthRef.current = messages.length;
    prevLastIdRef.current = messages.length ? messages[messages.length - 1].id : null;
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Scroll listener drives the "jump to latest" pill AND triggers infinite
  // scroll when the user reaches the top.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
      setIsAtBottom(nearBottom);
      if (nearBottom) setNewSinceScrollAway(0);
      if (
        container.scrollTop < 200 &&
        hasMoreBefore &&
        onLoadOlder &&
        !loadingOlder &&
        !loadingLockRef.current
      ) {
        loadingLockRef.current = true;
        pendingAnchorRef.current = container.scrollHeight;
        const result = onLoadOlder();
        if (result && typeof (result as Promise<void>).then === 'function') {
          (result as Promise<void>).catch(() => {
            loadingLockRef.current = false;
            pendingAnchorRef.current = null;
          });
        }
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [hasMoreBefore, onLoadOlder, loadingOlder]);

  // Read tracking via IntersectionObserver.
  const markMessagesAsRead = useCallback(async (ids: string[]) => {
    if (!channelId || ids.length === 0) return;
    try {
      await fetch('/api/live/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: ids, channelId }),
      });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-message-id');
          if (!id) continue;
          if (entry.isIntersecting) {
            const t = setTimeout(() => {
              markMessagesAsRead([id]);
              setVisibleMessages((prev) => new Set(prev).add(id));
            }, 1000);
            readTimeouts.set(id, t);
          } else {
            const t = readTimeouts.get(id);
            if (t) {
              clearTimeout(t);
              readTimeouts.delete(id);
            }
          }
        }
      },
      { threshold: 0.5, rootMargin: '0px 0px -10% 0px' }
    );
    messageRefs.current.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      readTimeouts.forEach((t) => clearTimeout(t));
    };
  }, [channelId, messages, markMessagesAsRead, readTimeouts]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewSinceScrollAway(0);
    setFirstUnreadId(null);
  };

  const jumpToMessage = (id: string) => {
    const el = messageRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    window.setTimeout(() => setFlashId((v) => (v === id ? null : v)), 1500);
  };

  // Drag & drop — broadcast dropped files so MessageInput can pick them up.
  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    e.preventDefault();
    setDragOver(false);
    window.dispatchEvent(new CustomEvent('chat:upload-files', { detail: files }));
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 overflow-y-auto px-6 py-4 ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {hasMoreBefore && (
        <div className="flex items-center justify-center py-3">
          {loadingOlder ? (
            <span className="inline-flex items-center gap-2 text-xs text-[rgba(220,235,255,0.65)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading earlier messages…
            </span>
          ) : (
            <span className="text-[11px] text-[rgba(220,235,255,0.45)]">Scroll up to load more</span>
          )}
        </div>
      )}
      {!hasMoreBefore && messages.length > 0 && (
        <div className="flex items-center justify-center py-3 text-[11px] text-[rgba(220,235,255,0.4)]">
          Beginning of the conversation
        </div>
      )}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const showDateChip =
          i === 0 || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
        const timeDelta = prev
          ? new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()
          : Infinity;
        const groupStart =
          i === 0 ||
          showDateChip ||
          prev.authorId !== m.authorId ||
          timeDelta > GROUP_WINDOW_MS;
        const showUnreadDivider = firstUnreadId === m.id;
        return (
          <div key={m.id} className={groupStart ? 'mt-4 first:mt-0' : 'mt-0.5'}>
            {showDateChip && (
              <div className="flex items-center gap-3 py-3 text-[rgba(220,235,255,0.55)]">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <div className="text-[11px] font-mono tracking-wide uppercase px-2 py-0.5 rounded-full border border-white/[0.06] bg-[color:var(--nav-bg)]/40">
                  {formatDateChip(new Date(m.createdAt))}
                </div>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
            )}
            {showUnreadDivider && (
              <div className="flex items-center gap-3 py-2" aria-label="New messages">
                <div className="flex-1 h-px bg-[color:hsl(var(--primary)/0.45)]" />
                <div className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[color:hsl(var(--primary)/0.15)] text-[color:hsl(var(--primary))] ring-1 ring-[color:hsl(var(--primary)/0.4)]">
                  New
                </div>
                <div className="flex-1 h-px bg-[color:hsl(var(--primary)/0.45)]" />
              </div>
            )}
            <MessageItem
              ref={(el) => {
                if (el) messageRefs.current.set(m.id, el);
                else messageRefs.current.delete(m.id);
              }}
              msg={m}
              onUnsendMessage={onUnsendMessage}
              onJumpToMessage={jumpToMessage}
              onReplyMessage={onReplyMessage}
              onEditMessage={onEditMessage}
              onTogglePin={onTogglePin}
              onOpenThread={onOpenThread}
              canPin={canPin}
              flashed={flashId === m.id}
              groupStart={groupStart}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />

      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="sticky bottom-3 left-1/2 -translate-x-1/2 ml-[50%] inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-[hsl(var(--primary))]/90 hover:bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-medium shadow-[0_0_18px_hsl(var(--primary)/0.35)] backdrop-blur"
          aria-label={newSinceScrollAway > 0 ? `${newSinceScrollAway} new messages, jump to latest` : 'Jump to latest'}
        >
          <ArrowDown className="h-3.5 w-3.5" />
          {newSinceScrollAway > 0
            ? `${newSinceScrollAway} new message${newSinceScrollAway === 1 ? '' : 's'}`
            : 'Jump to latest'}
        </button>
      )}

      {dragOver && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          <div className="rounded-2xl border-2 border-dashed border-[color:hsl(var(--primary)/0.5)] bg-[color:hsl(var(--primary)/0.08)] backdrop-blur-md px-8 py-6 text-[rgba(236,245,255,0.95)] font-medium">
            Drop files to upload
          </div>
        </div>
      )}
    </div>
  );
}
