'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  Database,
  FileText,
  BookOpen,
  Video,
  Mail,
  Bell,
  Shield,
  Bug,
  Megaphone,
  Search,
  UserCog,
  MessagesSquare,
  ScrollText,
  HeartPulse,
  Flag,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';

type Command = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
  superOnly?: boolean;
  run: () => void;
};

interface CommandPaletteProps {
  adminHash: string;
  role?: 'super-admin' | 'moderator';
}

export default function CommandPalette({ adminHash, role = 'moderator' }: CommandPaletteProps) {
  const isSuperAdmin = role === 'super-admin';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        const typingInField =
          (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) &&
          target?.getAttribute('data-palette-input') !== 'true';
        if (typingInField) return;
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const commands: Command[] = useMemo(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    const all: Command[] = [
      { id: 'dashboard', label: 'Dashboard', group: 'Overview', icon: BarChart3, keywords: 'overview stats home', run: go(`/admin/${adminHash}/dashboard`) },
      { id: 'users', label: 'Users', group: 'Community', icon: Users, keywords: 'members accounts', run: go(`/admin/${adminHash}/users`) },
      { id: 'reports', label: 'User Reports', group: 'Community', icon: Shield, keywords: 'moderation abuse flag', run: go(`/admin/${adminHash}/reports`) },
      { id: 'channels', label: 'Channels & Groups', group: 'Community', icon: MessagesSquare, keywords: 'rooms voice', run: go(`/admin/${adminHash}/channels-groups`) },
      { id: 'blog', label: 'Blog', group: 'Content', icon: BookOpen, keywords: 'posts articles', run: go(`/admin/${adminHash}/blog`) },
      { id: 'tutorials', label: 'Tutorials', group: 'Content', icon: Video, keywords: 'videos learn', run: go(`/admin/${adminHash}/tutorials`) },
      { id: 'banner', label: 'Site Banner', group: 'Content', icon: Megaphone, keywords: 'announcement notice', superOnly: true, run: go(`/admin/${adminHash}/site-banner`) },
      { id: 'bugs', label: 'Bug Reports', group: 'Operations', icon: Bug, keywords: 'issues errors', run: go(`/admin/${adminHash}/bugs`) },
      { id: 'contact', label: 'Contact', group: 'Operations', icon: Mail, keywords: 'inbox messages', run: go(`/admin/${adminHash}/contact`) },
      { id: 'notifications', label: 'Notifications', group: 'Operations', icon: Bell, keywords: 'alerts updates', run: go(`/admin/${adminHash}/notifications`) },
      { id: 'broadcast', label: 'Broadcast', group: 'Operations', icon: Megaphone, keywords: 'announce notify blast send', superOnly: true, run: go(`/admin/${adminHash}/broadcast`) },
      { id: 'system', label: 'System Health', group: 'System', icon: HeartPulse, keywords: 'status uptime latency metrics monitoring', run: go(`/admin/${adminHash}/system`) },
      { id: 'feature-flags', label: 'Feature Flags', group: 'System', icon: Flag, keywords: 'toggles rollout gate experiment', superOnly: true, run: go(`/admin/${adminHash}/feature-flags`) },
      { id: 'audit', label: 'Audit Log', group: 'System', icon: ScrollText, keywords: 'history actions trail', run: go(`/admin/${adminHash}/audit-log`) },
      { id: 'database', label: 'Database', group: 'System', icon: Database, keywords: 'tables records sql', superOnly: true, run: go(`/admin/${adminHash}/database`) },
      { id: 'files', label: 'Files', group: 'System', icon: FileText, keywords: 'uploads storage s3', superOnly: true, run: go(`/admin/${adminHash}/files`) },
      { id: 'admins', label: 'Admins', group: 'System', icon: UserCog, keywords: 'roles permissions grants', superOnly: true, run: go(`/admin/${adminHash}/admins`) },
    ];
    return isSuperAdmin ? all : all.filter((c) => !c.superOnly);
  }, [adminHash, router, isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        (c.keywords ?? '').toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [filtered.length, cursor]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[cursor]?.run();
    }
  };

  if (!open) return null;

  const grouped = filtered.reduce<Record<string, { cmd: Command; idx: number }[]>>((acc, cmd, idx) => {
    (acc[cmd.group] ??= []).push({ cmd, idx });
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] p-4"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Admin command palette"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl bg-background border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            data-palette-input="true"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Type to search admin pages…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        <ul
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto py-2"
          role="listbox"
        >
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-muted-foreground">No matches</li>
          )}
          {Object.entries(grouped).map(([group, entries]) => (
            <li key={group} className="mb-1">
              <div className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                {group}
              </div>
              <ul>
                {entries.map(({ cmd, idx }) => {
                  const Icon = cmd.icon;
                  const active = idx === cursor;
                  return (
                    <li key={cmd.id}>
                      <button
                        type="button"
                        data-idx={idx}
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => cmd.run()}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                          active ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                        <span className="flex-1 text-left truncate">{cmd.label}</span>
                        {active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                        {!active && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-[11px] text-muted-foreground bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/5 border border-white/10 rounded px-1 py-0.5">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/5 border border-white/10 rounded px-1 py-0.5">↵</kbd>
              select
            </span>
          </div>
          <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
