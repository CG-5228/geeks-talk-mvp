"use client";
import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Search,
  Hash,
  Lock,
  ShieldCheck,
  Bell,
  BellOff,
  Star,
  Plus,
  AtSign,
  CircleDot,
  Timer,
  MoreHorizontal,
  Filter,
  Inbox,
} from 'lucide-react';
import type { Channel, LiveCounts, DMConversation } from '@/types/live';
import DMList from '@/components/live/dm/DMList';
import UnreadBadge from '@/components/live/indicators/UnreadBadge';
import ChannelDropdownMenu from '@/components/live/ChannelDropdownMenu';

const EXPANDED_WIDTH_DEFAULT = 300;
const COLLAPSED_WIDTH = 56;
const MIN_WIDTH = 240;
const MAX_WIDTH = 480;
const CATEGORY_ORDER = ['General', 'Computer General', 'Programming', 'Cybersecurity', 'Mathematics'];
type FilterMode = 'all' | 'unread' | 'mentions' | 'muted';

const LS = {
  collapsed: 'gt_chats_sidebar',
  width: 'gt_chats_sidebar_width',
  starred: 'gt_chats_sidebar_starred',
  muted: 'gt_chats_sidebar_muted',
  categories: 'gt_chats_sidebar_categories',
  filter: 'gt_chats_sidebar_filter',
} as const;

// ----- localStorage helpers (SSR-safe) -----
function readSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((v) => typeof v === 'string')) : new Set();
  } catch {
    return new Set();
  }
}
function writeSet(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}

// ----- hooks -----
function useLastSeenMap(channelIds: string[]) {
  const [map, setMap] = useState<Record<string, number>>({});
  const joined = channelIds.join(',');
  const refresh = useCallback(() => {
    if (typeof window === 'undefined') return;
    const next: Record<string, number> = {};
    for (const id of channelIds) {
      try {
        const raw = window.localStorage.getItem(`geekstalk:lastSeen:${id}`);
        next[id] = raw ? Number(raw) || 0 : 0;
      } catch {
        next[id] = 0;
      }
    }
    setMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  useEffect(() => {
    refresh();
    const onEvt = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('geekstalk:lastSeen:')) refresh();
    };
    window.addEventListener('chat:lastseen-updated', onEvt as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('chat:lastseen-updated', onEvt as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  return map;
}

function usePersistentSet(key: string) {
  const [set, setSet] = useState<Set<string>>(() => new Set());
  useEffect(() => setSet(readSet(key)), [key]);
  const toggle = useCallback(
    (id: string) => {
      setSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        writeSet(key, next);
        return next;
      });
    },
    [key],
  );
  return [set, toggle] as const;
}

// ----- props -----
interface Props {
  channels: Channel[];
  activeId: string | null;
  counts: LiveCounts;
  onSelect: (c: Channel) => void;
  onCreate: (name: string, topic?: string) => void;
  dmConversations?: DMConversation[];
  activeDMId?: string | null;
  onSelectDM?: (conversationId: string) => void;
  onStartDM?: (userId: string) => void;
  onShowFriends?: () => void;
  sidebarView?: 'channels' | 'dms';
  onShowCreateModal?: () => void;
  onDeleteChannel?: (channelId: string) => void;
  unreadCounts?: Record<string, number>;
  mentionCounts?: Record<string, number>;
  loading?: boolean;
}

export default function ChatsSidebar({
  channels,
  activeId,
  counts,
  onSelect,
  onCreate: _onCreate,
  dmConversations = [],
  activeDMId = null,
  onSelectDM,
  onStartDM,
  onShowFriends,
  sidebarView = 'channels',
  onShowCreateModal,
  onDeleteChannel,
  unreadCounts = {},
  mentionCounts = {},
  loading = false,
}: Props) {
  // ----- collapse + width -----
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(EXPANDED_WIDTH_DEFAULT);
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const savedCollapsed = window.localStorage.getItem(LS.collapsed) === '1';
    const savedWidthRaw = Number(window.localStorage.getItem(LS.width));
    const savedWidth = Number.isFinite(savedWidthRaw) && savedWidthRaw > 0
      ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, savedWidthRaw))
      : EXPANDED_WIDTH_DEFAULT;
    setCollapsed(savedCollapsed);
    setWidth(savedWidth);
    document.documentElement.style.setProperty(
      '--sidebar',
      savedCollapsed ? `${COLLAPSED_WIDTH}px` : `${savedWidth}px`,
    );
  }, []);

  const applyWidth = useCallback((w: number, collapse: boolean) => {
    const px = collapse ? COLLAPSED_WIDTH : w;
    document.documentElement.style.setProperty('--sidebar', `${px}px`);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LS.collapsed, next ? '1' : '0');
      } catch {}
      applyWidth(width, next);
      return next;
    });
  }, [applyWidth, width]);

  // ----- resize handle -----
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - getRailOffset()));
      setWidth(next);
      applyWidth(next, false);
    };
    const onUp = () => {
      setDragging(false);
      try {
        window.localStorage.setItem(LS.width, String(width));
      } catch {}
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, width, applyWidth]);

  // ----- state: filter, search, category expand, star, mute -----
  const [filter, setFilter] = useState<FilterMode>('all');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(LS.filter) as FilterMode | null;
    if (saved && ['all', 'unread', 'mentions', 'muted'].includes(saved)) setFilter(saved);
  }, []);
  const onFilterChange = useCallback((next: FilterMode) => {
    setFilter(next);
    try {
      window.localStorage.setItem(LS.filter, next);
    } catch {}
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set(['MAIN', 'STARRED', 'YOUR']));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LS.categories);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setExpandedCategories(new Set(arr));
      }
    } catch {}
  }, []);
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      try {
        window.localStorage.setItem(LS.categories, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  const [starred, toggleStarred] = usePersistentSet(LS.starred);
  const [muted, toggleMuted] = usePersistentSet(LS.muted);

  // ----- activity + filtering -----
  const channelIds = useMemo(() => channels.map((c) => c.id), [channels]);
  const lastSeenMap = useLastSeenMap(channelIds);
  const hasUnseenActivity = useCallback(
    (c: Channel) => {
      if (!c.lastMessageAt) return false;
      const last = new Date(c.lastMessageAt).getTime();
      const seen = lastSeenMap[c.id] || 0;
      return last > seen && c.id !== activeId;
    },
    [lastSeenMap, activeId],
  );

  const sortedMain = useMemo(() => {
    return channels
      .filter((c) => CATEGORY_ORDER.includes(c.category))
      .sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.category);
        const bi = CATEGORY_ORDER.indexOf(b.category);
        return ai === bi ? a.name.localeCompare(b.name) : ai - bi;
      });
  }, [channels]);
  const userChannels = useMemo(
    () => channels.filter((c) => c.category === 'Private').sort((a, b) => a.name.localeCompare(b.name)),
    [channels],
  );
  const starredChannels = useMemo(
    () => channels.filter((c) => starred.has(c.id)),
    [channels, starred],
  );

  const matchesFilter = useCallback(
    (c: Channel) => {
      const isMuted = muted.has(c.id);
      if (filter === 'muted') return isMuted;
      if (filter === 'unread') return hasUnseenActivity(c) || (unreadCounts[c.id] ?? 0) > 0;
      if (filter === 'mentions') return (mentionCounts[c.id] ?? 0) > 0;
      return true;
    },
    [filter, muted, hasUnseenActivity, unreadCounts, mentionCounts],
  );

  const matchesQuery = useCallback(
    (c: Channel) => c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    [searchQuery],
  );

  const visibleStarred = starredChannels.filter((c) => matchesFilter(c) && matchesQuery(c));
  const visibleMain = sortedMain.filter((c) => matchesFilter(c) && matchesQuery(c));
  const visibleUser = userChannels.filter((c) => matchesFilter(c) && matchesQuery(c));

  const totalUnreadMain = visibleMain.filter((c) => hasUnseenActivity(c)).length;
  const totalUnreadUser = visibleUser.filter((c) => hasUnseenActivity(c)).length;

  // ----- keyboard roving nav -----
  const flatVisible = useMemo(
    () => [...visibleStarred, ...visibleMain, ...visibleUser].map((c) => c.id),
    [visibleStarred, visibleMain, visibleUser],
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const onListKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (!flatVisible.length) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const currentId = activeEl?.getAttribute('data-ch-id');
      const idx = currentId ? flatVisible.indexOf(currentId) : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = idx === -1 ? 0 : Math.min(flatVisible.length - 1, idx + 1);
        focusRow(listRef.current, flatVisible[next]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = idx === -1 ? 0 : Math.max(0, idx - 1);
        focusRow(listRef.current, flatVisible[next]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusRow(listRef.current, flatVisible[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        focusRow(listRef.current, flatVisible[flatVisible.length - 1]);
      }
    },
    [flatVisible],
  );

  const handleDeleteChannel = (channelId: string) => onDeleteChannel?.(channelId);

  const ariaLabel = sidebarView === 'dms' ? 'Direct messages navigation' : 'Channels navigation';

  return (
    <aside
      aria-label={ariaLabel}
      data-collapsed={collapsed ? 'true' : 'false'}
      className={[
        'relative h-full flex flex-col overflow-hidden',
        'border-r border-border/20 bg-[color:var(--nav-bg)]/50 backdrop-blur-xl',
        'w-[var(--sidebar,300px)]',
        dragging ? '' : 'transition-[width] duration-200 ease-out',
      ].join(' ')}
    >
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-3 flex-shrink-0 border-b border-border/10">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-md bg-[color:hsl(var(--primary))/0.15] ring-1 ring-[color:hsl(var(--primary))/0.35] grid place-items-center">
              <Inbox className="w-4 h-4 text-[color:hsl(var(--primary))]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[rgba(236,245,255,0.96)] leading-tight truncate">
                {sidebarView === 'dms' ? 'Direct Messages' : 'Geeks Talk'}
              </div>
              <div className="text-[11px] text-[rgba(220,235,255,0.5)] leading-tight truncate">
                {sidebarView === 'dms'
                  ? `${dmConversations.length} ${dmConversations.length === 1 ? 'conversation' : 'conversations'}`
                  : `${channels.length} channels`}
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={[
            'size-8 rounded-lg hover:bg-white/10 active:bg-white/15 grid place-items-center',
            'transition-colors duration-150 text-[rgba(220,235,255,0.75)] hover:text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))/0.6]',
            collapsed ? 'mx-auto' : '',
          ].join(' ')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Filter chips + Search */}
      {!collapsed && sidebarView === 'channels' && (
        <div className="px-3 pt-2 pb-2 flex-shrink-0 space-y-2">
          <FilterChips value={filter} onChange={onFilterChange} />
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.5)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Filter channels…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={[
                'w-full pl-9 pr-12 py-2 text-sm rounded-lg',
                'bg-white/[0.04] border border-border/20',
                'text-[rgba(236,245,255,0.96)] placeholder:text-[rgba(220,235,255,0.45)]',
                'focus:outline-none focus:ring-2 focus:ring-[color:hsl(var(--primary))/0.55] focus:border-[color:hsl(var(--primary))/0.35]',
                'transition-colors duration-150',
              ].join(' ')}
              aria-label="Filter channels by name"
            />
            <kbd
              aria-hidden="true"
              className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center h-5 px-1.5 text-[10px] font-medium tracking-wide text-[rgba(220,235,255,0.55)] bg-white/[0.06] border border-border/20 rounded"
            >
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        ref={listRef}
        role={sidebarView === 'channels' ? 'tree' : undefined}
        aria-label={sidebarView === 'channels' ? 'Channels' : undefined}
        onKeyDown={sidebarView === 'channels' ? onListKeyDown : undefined}
        className={[
          'flex-1 overflow-y-auto min-h-0',
          'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
        ].join(' ')}
      >
        {sidebarView === 'dms' ? (
          <DMList
            conversations={dmConversations}
            activeConversationId={activeDMId}
            onSelectConversation={onSelectDM || (() => {})}
            onShowFriends={onShowFriends}
            onStartDM={onStartDM}
            collapsed={collapsed}
          />
        ) : loading ? (
          <Skeleton collapsed={collapsed} />
        ) : (
          <div className="px-2 py-2">
            {/* Starred */}
            {visibleStarred.length > 0 && (
              <CategorySection
                title="STARRED"
                icon={<Star className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />}
                collapsed={collapsed}
                expanded={expandedCategories.has('STARRED')}
                onToggle={() => toggleCategory('STARRED')}
                count={visibleStarred.length}
              >
                {visibleStarred.map((c) => (
                  <ChannelRow
                    key={`star-${c.id}`}
                    channel={c}
                    liveCount={counts[c.id] ?? 0}
                    unread={unreadCounts[c.id] ?? 0}
                    mentions={mentionCounts[c.id] ?? 0}
                    active={activeId === c.id}
                    hasActivity={hasUnseenActivity(c)}
                    starred
                    muted={muted.has(c.id)}
                    onSelect={() => onSelect(c)}
                    onToggleStar={() => toggleStarred(c.id)}
                    onToggleMute={() => toggleMuted(c.id)}
                    onDelete={handleDeleteChannel}
                    collapsed={collapsed}
                  />
                ))}
              </CategorySection>
            )}

            {/* Main */}
            <CategorySection
              title="CHANNELS"
              collapsed={collapsed}
              expanded={expandedCategories.has('MAIN')}
              onToggle={() => toggleCategory('MAIN')}
              count={visibleMain.length}
              unreadCount={totalUnreadMain}
              emptyHint={searchQuery ? `No match for "${searchQuery}"` : undefined}
            >
              {visibleMain.map((c) => (
                <ChannelRow
                  key={c.id}
                  channel={c}
                  liveCount={counts[c.id] ?? 0}
                  unread={unreadCounts[c.id] ?? 0}
                  mentions={mentionCounts[c.id] ?? 0}
                  active={activeId === c.id}
                  hasActivity={hasUnseenActivity(c)}
                  starred={starred.has(c.id)}
                  muted={muted.has(c.id)}
                  onSelect={() => onSelect(c)}
                  onToggleStar={() => toggleStarred(c.id)}
                  onToggleMute={() => toggleMuted(c.id)}
                  onDelete={handleDeleteChannel}
                  collapsed={collapsed}
                />
              ))}
            </CategorySection>

            {/* Your channels */}
            {(userChannels.length > 0 || filter !== 'all' || searchQuery) && (
              <CategorySection
                title="YOUR CHANNELS"
                collapsed={collapsed}
                expanded={expandedCategories.has('YOUR')}
                onToggle={() => toggleCategory('YOUR')}
                count={visibleUser.length}
                unreadCount={totalUnreadUser}
                action={
                  !collapsed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowCreateModal?.();
                      }}
                      className="size-5 grid place-items-center rounded hover:bg-white/10 text-[rgba(220,235,255,0.55)] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))/0.55]"
                      aria-label="Create a new channel"
                      title="Create a new channel"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )
                }
                emptyHint={
                  userChannels.length === 0
                    ? 'No private channels yet. Create one with +'
                    : searchQuery
                    ? `No match for "${searchQuery}"`
                    : undefined
                }
              >
                {visibleUser.map((c) => (
                  <ChannelRow
                    key={c.id}
                    channel={c}
                    liveCount={counts[c.id] ?? 0}
                    unread={unreadCounts[c.id] ?? 0}
                    mentions={mentionCounts[c.id] ?? 0}
                    active={activeId === c.id}
                    hasActivity={hasUnseenActivity(c)}
                    starred={starred.has(c.id)}
                    muted={muted.has(c.id)}
                    onSelect={() => onSelect(c)}
                    onToggleStar={() => toggleStarred(c.id)}
                    onToggleMute={() => toggleMuted(c.id)}
                    onDelete={handleDeleteChannel}
                    collapsed={collapsed}
                    ownerControls
                  />
                ))}
              </CategorySection>
            )}

            {/* Full-empty state */}
            {visibleStarred.length === 0 &&
              visibleMain.length === 0 &&
              visibleUser.length === 0 && (
                <EmptyState
                  filter={filter}
                  query={searchQuery}
                  onClearFilter={() => {
                    onFilterChange('all');
                    setSearchQuery('');
                  }}
                />
              )}
          </div>
        )}
      </div>

      {/* Footer: Create channel primary CTA */}
      {sidebarView === 'channels' && (
        <div className="flex-shrink-0 p-2 border-t border-border/10">
          <button
            type="button"
            onClick={() => onShowCreateModal?.()}
            className={[
              'w-full flex items-center justify-center gap-2 rounded-md px-3 py-2',
              'text-[13px] font-medium',
              'bg-[color:hsl(var(--primary))/0.12] hover:bg-[color:hsl(var(--primary))/0.2]',
              'text-[color:hsl(var(--primary))] ring-1 ring-[color:hsl(var(--primary))/0.3]',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))/0.6]',
            ].join(' ')}
            aria-label="Create a new channel"
            title="Create a new channel"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {!collapsed && <span>New channel</span>}
          </button>
        </div>
      )}

      {/* Resize handle */}
      {!collapsed && (
        <button
          type="button"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          onMouseDown={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              const next = Math.max(MIN_WIDTH, width - 16);
              setWidth(next);
              applyWidth(next, false);
              try {
                window.localStorage.setItem(LS.width, String(next));
              } catch {}
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              const next = Math.min(MAX_WIDTH, width + 16);
              setWidth(next);
              applyWidth(next, false);
              try {
                window.localStorage.setItem(LS.width, String(next));
              } catch {}
            }
          }}
          className={[
            'absolute top-0 right-0 h-full w-1.5 cursor-col-resize',
            'group/resize',
            'focus-visible:outline-none',
          ].join(' ')}
          title="Drag to resize"
        >
          <span
            aria-hidden="true"
            className={[
              'absolute inset-y-0 right-0 w-px bg-transparent',
              'group-hover/resize:bg-[color:hsl(var(--primary))/0.5]',
              'group-focus-visible/resize:bg-[color:hsl(var(--primary))/0.8]',
              dragging ? 'bg-[color:hsl(var(--primary))]' : '',
              'transition-colors duration-150',
            ].join(' ')}
          />
        </button>
      )}
    </aside>
  );
}

// ----- helpers -----
function getRailOffset() {
  // Server rail column is 72px on lg+, 0 below. Measure at call time.
  if (typeof window === 'undefined') return 0;
  const rail = document.querySelector('[data-server-rail]');
  if (!rail) return 0;
  const rect = rail.getBoundingClientRect();
  return rect.right;
}

function focusRow(container: HTMLElement | null, id: string | undefined) {
  if (!container || !id) return;
  const el = container.querySelector<HTMLElement>(`[data-ch-id="${CSS.escape(id)}"]`);
  if (el) el.focus();
}

// ----- FilterChips -----
function FilterChips({ value, onChange }: { value: FilterMode; onChange: (v: FilterMode) => void }) {
  const items: { id: FilterMode; label: string; icon: ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Filter className="w-3 h-3" aria-hidden="true" /> },
    { id: 'unread', label: 'Unread', icon: <CircleDot className="w-3 h-3" aria-hidden="true" /> },
    { id: 'mentions', label: 'Mentions', icon: <AtSign className="w-3 h-3" aria-hidden="true" /> },
    { id: 'muted', label: 'Muted', icon: <BellOff className="w-3 h-3" aria-hidden="true" /> },
  ];
  return (
    <div role="radiogroup" aria-label="Filter channels" className="flex items-center gap-1">
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(it.id)}
            className={[
              'h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-medium',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))/0.55]',
              active
                ? 'bg-[color:hsl(var(--primary))/0.18] text-[color:hsl(var(--primary))] ring-1 ring-[color:hsl(var(--primary))/0.35]'
                : 'text-[rgba(220,235,255,0.65)] hover:text-white hover:bg-white/5',
            ].join(' ')}
            title={it.label}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ----- CategorySection -----
function CategorySection({
  title,
  icon,
  children,
  collapsed,
  expanded,
  onToggle,
  count,
  unreadCount,
  action,
  emptyHint,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  count: number;
  unreadCount?: number;
  action?: ReactNode;
  emptyHint?: string;
}) {
  if (collapsed) {
    return <div className="h-2" aria-hidden="true">{expanded ? children : null}</div>;
  }
  const hasUnread = (unreadCount ?? 0) > 0;
  return (
    <div className="mb-2">
      <div className="group flex items-center pr-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={[
            'flex-1 flex items-center justify-between px-2 py-1.5 rounded-md',
            'text-[11.5px] font-semibold uppercase tracking-wider',
            'text-[rgba(220,235,255,0.6)] hover:text-[rgba(220,235,255,0.95)] hover:bg-white/[0.04]',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))/0.55]',
          ].join(' ')}
        >
          <span className="flex items-center gap-1.5">
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
              aria-hidden="true"
            />
            {icon}
            <span>{title}</span>
          </span>
          <span className="flex items-center gap-1.5">
            {hasUnread && (
              <span
                className="min-w-[16px] h-[16px] px-1 rounded-full bg-[color:hsl(var(--primary))] text-[10px] text-[color:hsl(var(--primary-foreground))] font-bold grid place-items-center"
                aria-label={`${unreadCount} unread`}
                title={`${unreadCount} unread`}
              >
                {unreadCount! > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span
              className="text-[10px] tabular-nums px-1.5 py-[2px] rounded-full bg-white/[0.06] text-[rgba(220,235,255,0.55)] font-medium"
              aria-hidden="true"
            >
              {count}
            </span>
          </span>
        </button>
        {action && <div className="opacity-0 group-hover:opacity-100 transition-opacity">{action}</div>}
      </div>
      {expanded && (
        <div className="mt-1 space-y-[2px]">
          {children}
          {Children.count(children) === 0 && emptyHint && (
            <div className="px-3 py-2 text-[11.5px] text-[rgba(220,235,255,0.45)] italic">{emptyHint}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ----- EmptyState -----
function EmptyState({
  filter,
  query,
  onClearFilter,
}: {
  filter: FilterMode;
  query: string;
  onClearFilter: () => void;
}) {
  let title = 'No channels yet';
  let hint = 'Create your first channel from the button below.';
  if (query) {
    title = 'No results';
    hint = `No channels match "${query}".`;
  } else if (filter === 'unread') {
    title = 'All caught up';
    hint = 'No unread channels right now.';
  } else if (filter === 'mentions') {
    title = 'No mentions';
    hint = 'You have no unread @-mentions.';
  } else if (filter === 'muted') {
    title = 'No muted channels';
    hint = 'Mute a channel to hide it from default view.';
  }
  return (
    <div className="px-3 py-6 text-center">
      <div className="mx-auto mb-2 size-10 rounded-full bg-white/[0.04] grid place-items-center">
        <Hash className="w-5 h-5 text-[rgba(220,235,255,0.35)]" aria-hidden="true" />
      </div>
      <div className="text-[13px] font-medium text-[rgba(236,245,255,0.9)]">{title}</div>
      <div className="mt-1 text-[11.5px] text-[rgba(220,235,255,0.55)]">{hint}</div>
      {(filter !== 'all' || query) && (
        <button
          type="button"
          onClick={onClearFilter}
          className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-[color:hsl(var(--primary))] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))/0.55] rounded"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ----- Skeleton -----
function Skeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="px-2 py-2" aria-hidden="true">
      {[0, 1, 2].map((s) => (
        <div key={s} className="mb-3">
          {!collapsed && (
            <div className="h-4 w-24 mb-2 mx-2 rounded bg-white/[0.05] animate-pulse" />
          )}
          <div className="space-y-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-8 rounded-md bg-white/[0.04] animate-pulse ${collapsed ? 'mx-1' : 'mx-2'}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ----- ChannelRow -----
interface ChannelRowProps {
  channel: Channel;
  liveCount: number;
  unread: number;
  mentions: number;
  active?: boolean;
  hasActivity?: boolean;
  starred?: boolean;
  muted?: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  onToggleMute: () => void;
  onDelete?: (id: string) => void;
  collapsed: boolean;
  ownerControls?: boolean;
}

function ChannelRow({
  channel,
  liveCount,
  unread,
  mentions,
  active,
  hasActivity,
  starred,
  muted,
  onSelect,
  onToggleStar,
  onToggleMute,
  onDelete,
  collapsed,
  ownerControls,
}: ChannelRowProps) {
  const emphasize = !!hasActivity && !active && !muted;
  const hasMention = mentions > 0;
  const TypeIcon = channel.hasPassword ? Lock : channel.inviteOnly ? ShieldCheck : Hash;
  const rowId = `channel-row-${channel.id}`;

  const labelText = collapsed
    ? channel.name
    : `${channel.hasPassword ? 'Locked channel' : channel.inviteOnly ? 'Invite-only channel' : 'Channel'} ${channel.name}${
        muted ? ', muted' : ''
      }${hasActivity ? ', new activity' : ''}${hasMention ? `, ${mentions} mention${mentions > 1 ? 's' : ''}` : ''}`;

  return (
    <div
      role="treeitem"
      aria-level={1}
      aria-selected={!!active}
      className={[
        'group relative flex items-center',
        collapsed ? 'justify-center px-1 mx-1' : 'gap-1.5 px-1.5 mx-0.5',
        'rounded-md',
        active
          ? 'bg-white/[0.08] ring-1 ring-[color:hsl(var(--primary))/0.35]'
          : 'hover:bg-white/[0.05] active:bg-white/[0.08]',
        'transition-colors duration-120',
      ].join(' ')}
    >
      {/* Left active accent */}
      {active && !collapsed && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[color:hsl(var(--primary))]"
        />
      )}

      <button
        id={rowId}
        type="button"
        role="link"
        data-ch-id={channel.id}
        onClick={onSelect}
        aria-current={active ? 'page' : undefined}
        aria-label={labelText}
        title={collapsed ? channel.name : undefined}
        tabIndex={active ? 0 : -1}
        className={[
          'flex-1 flex items-center min-w-0',
          collapsed ? 'justify-center h-9' : 'gap-2 h-9 pl-1.5 pr-1',
          'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))/0.6]',
        ].join(' ')}
      >
        {/* Type icon with unseen-activity pip */}
        <span className="relative flex-shrink-0 grid place-items-center">
          <TypeIcon
            className={[
              'w-4 h-4',
              muted
                ? 'text-[rgba(220,235,255,0.35)]'
                : active
                ? 'text-[color:hsl(var(--primary))]'
                : emphasize
                ? 'text-white'
                : 'text-[rgba(220,235,255,0.65)]',
            ].join(' ')}
            aria-hidden="true"
          />
          {emphasize && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[color:hsl(var(--primary))] ring-2 ring-[color:var(--nav-bg)]"
            />
          )}
        </span>

        {/* Name */}
        {!collapsed && (
          <span
            className={[
              'truncate text-[13.5px] leading-none',
              muted
                ? 'text-[rgba(220,235,255,0.48)]'
                : active
                ? 'text-white font-semibold'
                : emphasize
                ? 'text-white font-semibold'
                : 'text-[rgba(236,245,255,0.88)]',
            ].join(' ')}
          >
            {channel.name}
          </span>
        )}

        {/* Right-side meta */}
        {!collapsed && (
          <span className="ml-auto flex items-center gap-1.5">
            {starred && !hasMention && unread === 0 && liveCount === 0 && (
              <Star className="w-3 h-3 text-amber-300 fill-amber-300" aria-hidden="true" />
            )}
            {channel.slowModeSeconds && channel.slowModeSeconds > 0 ? (
              <span
                title={`Slow mode: ${formatSlowMode(channel.slowModeSeconds)}`}
                className="inline-flex items-center gap-0.5 text-[10px] text-[rgba(220,235,255,0.5)]"
              >
                <Timer className="w-3 h-3" aria-hidden="true" />
              </span>
            ) : null}
            {liveCount > 0 && (
              <span
                title={`${liveCount} online`}
                className="inline-flex items-center gap-1 text-[10.5px] tabular-nums text-emerald-300/90 group-hover:opacity-100 opacity-80"
                aria-label={`${liveCount} users online`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                {liveCount}
              </span>
            )}
            {hasMention && (
              <span
                className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center"
                aria-label={`${mentions} mentions`}
                title={`${mentions} mentions`}
              >
                {mentions > 99 ? '99+' : mentions}
              </span>
            )}
            {!hasMention && unread > 0 && !muted && <UnreadBadge count={unread} type="channel" />}
            {muted && <BellOff className="w-3 h-3 text-[rgba(220,235,255,0.45)]" aria-hidden="true" />}
          </span>
        )}
        {/* Collapsed indicators — show a compact dot stack */}
        {collapsed && (hasMention || unread > 0 || emphasize) && (
          <span
            aria-hidden="true"
            className={[
              'absolute top-1 right-1 w-1.5 h-1.5 rounded-full',
              hasMention ? 'bg-red-500' : 'bg-[color:hsl(var(--primary))]',
            ].join(' ')}
          />
        )}
      </button>

      {/* Hover actions (star / mute / menu) */}
      {!collapsed && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <IconToggle
            active={!!starred}
            onClick={onToggleStar}
            onIcon={<Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />}
            offIcon={<Star className="w-3.5 h-3.5" aria-hidden="true" />}
            label={starred ? 'Unstar channel' : 'Star channel'}
          />
          <IconToggle
            active={!!muted}
            onClick={onToggleMute}
            onIcon={<BellOff className="w-3.5 h-3.5" aria-hidden="true" />}
            offIcon={<Bell className="w-3.5 h-3.5" aria-hidden="true" />}
            label={muted ? 'Unmute channel' : 'Mute channel'}
          />
          {ownerControls && onDelete ? (
            <ChannelDropdownMenu
              channelId={channel.id}
              channelName={channel.name}
              isOwner={true}
              onDeleteChannel={onDelete}
            />
          ) : (
            <button
              type="button"
              className="size-6 grid place-items-center rounded text-[rgba(220,235,255,0.55)] hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))/0.55]"
              aria-label={`More actions for ${channel.name}`}
              title="More actions"
              onClick={(e) => {
                e.stopPropagation();
                // Hook point: future right-click / quick menu
              }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IconToggle({
  active,
  onClick,
  onIcon,
  offIcon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  onIcon: ReactNode;
  offIcon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={[
        'size-6 grid place-items-center rounded transition-colors',
        active
          ? 'text-amber-300'
          : 'text-[rgba(220,235,255,0.55)] hover:text-white hover:bg-white/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary))/0.55]',
      ].join(' ')}
    >
      {active ? onIcon : offIcon}
    </button>
  );
}

// ----- utils -----
function formatSlowMode(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

