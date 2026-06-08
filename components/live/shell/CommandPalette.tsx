"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  Search,
  Hash,
  Lock,
  MessageSquare,
  Plus,
  Users,
  ArrowDownUp,
  CornerDownLeft,
  X,
} from 'lucide-react';
import type { Channel, DMConversation } from '@/types/live';

export type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  channels: Channel[];
  dmConversations: DMConversation[];
  onSelectChannel: (channel: Channel) => void;
  onSelectDM: (conversationId: string) => void;
  actions?: PaletteAction[];
};

type Row =
  | { kind: 'channel'; channel: Channel }
  | { kind: 'dm'; dm: DMConversation }
  | { kind: 'action'; action: PaletteAction };

const DEFAULT_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

function scoreMatch(haystack: string, needle: string): number {
  if (!needle) return 1;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  const idx = h.indexOf(n);
  if (idx >= 0) return 50 - Math.min(idx, 40);
  let hi = 0;
  let ni = 0;
  while (hi < h.length && ni < n.length) {
    if (h[hi] === n[ni]) ni++;
    hi++;
  }
  return ni === n.length ? 10 : 0;
}

export default function CommandPalette({
  open,
  onClose,
  channels,
  dmConversations,
  onSelectChannel,
  onSelectDM,
  actions = [],
}: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    const channelRows: Array<{ row: Row; score: number }> = channels.map((c) => ({
      row: { kind: 'channel', channel: c },
      score: scoreMatch(c.name, query),
    }));
    const dmRows: Array<{ row: Row; score: number }> = dmConversations.map((d) => ({
      row: { kind: 'dm', dm: d },
      score: Math.max(
        scoreMatch(d.otherUser.name, query),
        scoreMatch(d.otherUser.username, query),
      ),
    }));
    const actionRows: Array<{ row: Row; score: number }> = actions.map((a) => ({
      row: { kind: 'action', action: a },
      score: scoreMatch(`${a.label} ${a.hint ?? ''}`, query),
    }));
    const all = [...channelRows, ...dmRows, ...actionRows]
      .filter((r) => (query ? r.score > 0 : true))
      .sort((a, b) => b.score - a.score);
    return all.map((r) => r.row);
  }, [channels, dmConversations, actions, query]);

  useEffect(() => {
    if (activeIndex >= rows.length) setActiveIndex(Math.max(0, rows.length - 1));
  }, [rows.length, activeIndex]);

  const runRow = useCallback(
    (row: Row) => {
      if (row.kind === 'channel') onSelectChannel(row.channel);
      else if (row.kind === 'dm') onSelectDM(row.dm.id);
      else row.action.run();
      onClose();
    },
    [onSelectChannel, onSelectDM, onClose],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, rows.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(Math.max(0, rows.length - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row) runRow(row);
    }
  };

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-palette-row="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!mounted || !open) return null;

  const grouped: { channels: Row[]; dms: Row[]; actions: Row[] } = {
    channels: [],
    dms: [],
    actions: [],
  };
  rows.forEach((r) => {
    if (r.kind === 'channel') grouped.channels.push(r);
    else if (r.kind === 'dm') grouped.dms.push(r);
    else grouped.actions.push(r);
  });

  let runningIndex = -1;
  const renderRow = (row: Row) => {
    runningIndex += 1;
    const idx = runningIndex;
    const isActive = idx === activeIndex;
    const base =
      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors min-h-[44px]';
    const state = isActive
      ? 'bg-[hsl(var(--primary))]/15 ring-1 ring-[hsl(var(--primary))]/40 text-[rgba(236,245,255,0.98)]'
      : 'hover:bg-white/[0.04] text-[rgba(220,235,255,0.85)]';

    if (row.kind === 'channel') {
      const c = row.channel;
      const Icon = c.visibility === 'private' ? Lock : Hash;
      return (
        <button
          key={`ch-${c.id}`}
          type="button"
          role="option"
          aria-selected={isActive}
          data-palette-row={idx}
          onMouseEnter={() => setActiveIndex(idx)}
          onClick={() => runRow(row)}
          className={`${base} ${state}`}
        >
          <Icon className="h-4 w-4 shrink-0 text-[rgba(220,235,255,0.7)]" />
          <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
          {c.topic && (
            <span className="hidden sm:inline truncate max-w-[220px] text-xs text-[rgba(220,235,255,0.55)]">
              {c.topic}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wide text-[rgba(220,235,255,0.45)]">
            {c.category}
          </span>
        </button>
      );
    }
    if (row.kind === 'dm') {
      const d = row.dm;
      return (
        <button
          key={`dm-${d.id}`}
          type="button"
          role="option"
          aria-selected={isActive}
          data-palette-row={idx}
          onMouseEnter={() => setActiveIndex(idx)}
          onClick={() => runRow(row)}
          className={`${base} ${state}`}
        >
          <span className="relative inline-flex shrink-0">
            <Image
              src={d.otherUser.image || DEFAULT_AVATAR}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
              unoptimized={!d.otherUser.image}
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-[color:var(--nav-bg)] ${
                d.otherUser.onlineStatus === 'online'
                  ? 'bg-emerald-400'
                  : d.otherUser.onlineStatus === 'away'
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
              }`}
            />
          </span>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium">{d.otherUser.name}</div>
            <div className="truncate text-xs text-[rgba(220,235,255,0.55)]">
              @{d.otherUser.username}
              {d.lastMessage ? ` · ${d.lastMessage.content.slice(0, 40)}` : ''}
            </div>
          </div>
          {d.unreadCount > 0 && (
            <span className="rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--primary-foreground))]">
              {d.unreadCount}
            </span>
          )}
        </button>
      );
    }
    const a = row.action;
    const Icon = a.icon;
    return (
      <button
        key={`act-${a.id}`}
        type="button"
        role="option"
        aria-selected={isActive}
        data-palette-row={idx}
        onMouseEnter={() => setActiveIndex(idx)}
        onClick={() => runRow(row)}
        className={`${base} ${state}`}
      >
        <Icon className="h-4 w-4 shrink-0 text-[rgba(220,235,255,0.7)]" />
        <span className="flex-1 truncate text-sm font-medium">{a.label}</span>
        {a.hint && (
          <span className="text-xs text-[rgba(220,235,255,0.55)]">{a.hint}</span>
        )}
      </button>
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick switcher"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/30 bg-[color:var(--nav-bg)]/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 border-b border-border/20 px-4 py-3">
          <Search className="h-4 w-4 text-[rgba(220,235,255,0.6)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Jump to channel, DM, or action…"
            className="flex-1 bg-transparent text-sm text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.5)] outline-none"
            aria-label="Search channels, DMs and actions"
            aria-autocomplete="list"
            aria-controls="palette-list"
            aria-activedescendant={rows[activeIndex] ? `palette-row-${activeIndex}` : undefined}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-[rgba(220,235,255,0.6)] hover:bg-white/5 hover:text-[rgba(236,245,255,0.95)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={listRef}
          id="palette-list"
          role="listbox"
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[rgba(220,235,255,0.6)]">
              No matches for “{query}”
            </div>
          ) : (
            <>
              {grouped.channels.length > 0 && (
                <div className="mb-1">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgba(220,235,255,0.5)]">
                    Channels
                  </div>
                  <div className="space-y-0.5">{grouped.channels.map(renderRow)}</div>
                </div>
              )}
              {grouped.dms.length > 0 && (
                <div className="mb-1">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgba(220,235,255,0.5)]">
                    Direct Messages
                  </div>
                  <div className="space-y-0.5">{grouped.dms.map(renderRow)}</div>
                </div>
              )}
              {grouped.actions.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgba(220,235,255,0.5)]">
                    Actions
                  </div>
                  <div className="space-y-0.5">{grouped.actions.map(renderRow)}</div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/20 bg-black/20 px-4 py-2 text-[11px] text-[rgba(220,235,255,0.6)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <ArrowDownUp className="h-3 w-3" />
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              open
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">esc</kbd>
              close
            </span>
          </div>
          <span className="hidden sm:inline">
            {rows.length} result{rows.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function usePaletteShortcut(onToggle: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onToggle();
        return;
      }
      if (!isTyping && e.key === '/' && !(e.metaKey || e.ctrlKey || e.altKey)) {
        // Let the default focus-search behaviour still work elsewhere;
        // we only hijack when no input is focused.
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggle]);
}

export const PaletteIcons = { Plus, Users, MessageSquare, Hash };
