"use client";
import {
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import {
  MessageSquare,
  Users,
  MessagesSquare,
  AtSign,
  Bookmark,
  Bell,
  Search,
  Settings,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

type ViewType = 'channels' | 'dms';
type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

interface UserSummary {
  name?: string | null;
  image?: string | null;
  status?: PresenceStatus;
}

interface ServerRailProps {
  activeView?: ViewType;
  onViewChange?: (view: ViewType) => void;
  onOpenSearch?: () => void;
  onOpenShortcuts?: () => void;
  onOpenThreads?: () => void;
  onOpenMentions?: () => void;
  onOpenSaved?: () => void;
  onOpenActivity?: () => void;
  onOpenSettings?: () => void;
  user?: UserSummary;
  unreadCounts?: {
    dms?: number;
    threads?: number;
    mentions?: number;
    saved?: number;
    activity?: number;
  };
}

const DEFAULT_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

export default function ServerRail({
  activeView = 'channels',
  onViewChange,
  onOpenSearch,
  onOpenShortcuts,
  onOpenThreads,
  onOpenMentions,
  onOpenSaved,
  onOpenActivity,
  onOpenSettings,
  user,
  unreadCounts = {},
}: ServerRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);

  // Roving focus: arrow up/down moves focus between rail buttons
  const onKeyDown = useCallback((e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const buttons = Array.from(
      railRef.current?.querySelectorAll<HTMLButtonElement>('[data-rail-item]') ?? [],
    );
    if (buttons.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = buttons.findIndex((b) => b === current);
    let next = idx;
    if (e.key === 'ArrowDown') next = idx === -1 ? 0 : Math.min(buttons.length - 1, idx + 1);
    if (e.key === 'ArrowUp') next = idx === -1 ? buttons.length - 1 : Math.max(0, idx - 1);
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = buttons.length - 1;
    buttons[next]?.focus();
  }, []);

  const presenceColor = statusColor(user?.status ?? 'online');
  const presenceLabel = statusLabel(user?.status ?? 'online');

  return (
    <nav
      ref={railRef}
      data-server-rail
      aria-label="Primary navigation"
      onKeyDown={onKeyDown}
      className={[
        'w-[72px] h-full',
        'bg-[color:var(--nav-bg)]/70 backdrop-blur-xl',
        'border-r border-border/20',
        'flex flex-col items-center py-3 gap-1',
        'overflow-y-auto overflow-x-hidden',
        'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
      ].join(' ')}
    >
      {/* Brand badge */}
      <button
        data-rail-item
        type="button"
        onClick={() => onViewChange?.('channels')}
        aria-label="Geeks Talk — home"
        title="Geeks Talk"
        className={[
          'relative w-11 h-11 rounded-2xl grid place-items-center',
          'bg-gradient-to-br from-[color:hsl(var(--primary))/0.3] to-[color:hsl(var(--primary))/0.1]',
          'ring-1 ring-[color:hsl(var(--primary))/0.4]',
          'hover:from-[color:hsl(var(--primary))/0.45] hover:to-[color:hsl(var(--primary))/0.2]',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))]',
        ].join(' ')}
      >
        <Sparkles className="w-5 h-5 text-[color:hsl(var(--primary))]" aria-hidden="true" />
      </button>

      <Divider />

      {/* Primary sections */}
      <RailButton
        icon={<MessageSquare className="w-5 h-5" aria-hidden="true" />}
        label="Channels"
        active={activeView === 'channels'}
        onClick={() => onViewChange?.('channels')}
      />
      <RailButton
        icon={<Users className="w-5 h-5" aria-hidden="true" />}
        label="Direct messages"
        active={activeView === 'dms'}
        badge={unreadCounts.dms}
        onClick={() => onViewChange?.('dms')}
      />

      {onOpenThreads && (
        <RailButton
          icon={<MessagesSquare className="w-5 h-5" aria-hidden="true" />}
          label="Threads"
          badge={unreadCounts.threads}
          onClick={onOpenThreads}
        />
      )}
      {onOpenMentions && (
        <RailButton
          icon={<AtSign className="w-5 h-5" aria-hidden="true" />}
          label="Mentions"
          badge={unreadCounts.mentions}
          badgeTone="danger"
          onClick={onOpenMentions}
        />
      )}
      {onOpenSaved && (
        <RailButton
          icon={<Bookmark className="w-5 h-5" aria-hidden="true" />}
          label="Saved"
          badge={unreadCounts.saved}
          onClick={onOpenSaved}
        />
      )}
      {onOpenActivity && (
        <RailButton
          icon={<Bell className="w-5 h-5" aria-hidden="true" />}
          label="Activity"
          badge={unreadCounts.activity}
          onClick={onOpenActivity}
        />
      )}
      {onOpenSearch && (
        <RailButton
          icon={<Search className="w-5 h-5" aria-hidden="true" />}
          label="Search (⌘K)"
          onClick={onOpenSearch}
        />
      )}

      {/* Spacer pushes footer down */}
      <div className="flex-1 min-h-2" />

      {(onOpenShortcuts || onOpenSettings) && <Divider />}

      {onOpenShortcuts && (
        <RailButton
          icon={<HelpCircle className="w-5 h-5" aria-hidden="true" />}
          label="Keyboard shortcuts"
          onClick={onOpenShortcuts}
        />
      )}
      {onOpenSettings && (
        <RailButton
          icon={<Settings className="w-5 h-5" aria-hidden="true" />}
          label="Settings"
          onClick={onOpenSettings}
        />
      )}

      {/* User avatar badge */}
      {user && (
        <button
          data-rail-item
          type="button"
          onClick={onOpenSettings}
          aria-label={`Your profile — ${user.name ?? 'You'} (${presenceLabel})`}
          title={`${user.name ?? 'You'} — ${presenceLabel}`}
          className={[
            'relative mt-1 w-10 h-10 rounded-full overflow-hidden',
            'ring-2 ring-border/20 hover:ring-[color:hsl(var(--primary))/0.6]',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))]',
          ].join(' ')}
        >
          <Image
            src={user.image || DEFAULT_AVATAR}
            alt=""
            width={40}
            height={40}
            className="w-full h-full object-cover"
            unoptimized
          />
          <span
            aria-hidden="true"
            className={[
              'absolute bottom-0 right-0 block w-3 h-3 rounded-full',
              'ring-2 ring-[color:var(--nav-bg)]',
              presenceColor,
            ].join(' ')}
          />
        </button>
      )}
    </nav>
  );
}

// ----- helpers -----
function statusColor(status: PresenceStatus) {
  switch (status) {
    case 'online':
      return 'bg-emerald-400';
    case 'away':
      return 'bg-amber-400';
    case 'dnd':
      return 'bg-red-500';
    case 'offline':
    default:
      return 'bg-slate-400';
  }
}

function statusLabel(status: PresenceStatus) {
  switch (status) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    case 'dnd':
      return 'Do not disturb';
    case 'offline':
    default:
      return 'Offline';
  }
}

function Divider() {
  return <div aria-hidden="true" className="w-7 h-px bg-border/25 my-1" />;
}

interface RailButtonProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  badgeTone?: 'primary' | 'danger';
  onClick: () => void;
}

function RailButton({ icon, label, active, badge, badgeTone = 'primary', onClick }: RailButtonProps) {
  const hasBadge = typeof badge === 'number' && badge > 0;
  return (
    <button
      data-rail-item
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      title={label}
      className={[
        'relative w-11 h-11 rounded-xl grid place-items-center group',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))]',
        active
          ? 'bg-[color:hsl(var(--primary))/0.18] text-[color:hsl(var(--primary))] ring-1 ring-[color:hsl(var(--primary))/0.4]'
          : 'bg-white/[0.04] hover:bg-white/[0.1] text-[rgba(220,235,255,0.75)] hover:text-white',
      ].join(' ')}
    >
      {/* Active pill indicator (left) */}
      <span
        aria-hidden="true"
        className={[
          'absolute -left-[10px] top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-white',
          'transition-all duration-200 ease-out',
          active ? 'h-6 opacity-100' : 'h-2 opacity-0 group-hover:opacity-60 group-hover:h-4',
        ].join(' ')}
      />
      {icon}
      {hasBadge && (
        <span
          className={[
            'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full',
            'text-[10px] font-bold grid place-items-center',
            'ring-2 ring-[color:var(--nav-bg)]',
            badgeTone === 'danger'
              ? 'bg-red-500 text-white'
              : 'bg-[color:hsl(var(--primary))] text-[color:hsl(var(--primary-foreground))]',
          ].join(' ')}
          aria-label={`${badge} unread`}
        >
          {badge! > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
