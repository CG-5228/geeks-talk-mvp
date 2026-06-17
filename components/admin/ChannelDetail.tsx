'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Flag,
  Globe,
  Hash,
  Keyboard,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Star,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import BulkActionBar from '@/components/admin/BulkActionBar';
import { useAdminToast } from '@/components/admin/AdminToast';
import { downloadCSV } from '@/lib/csv';
import {
  CHANNEL_CATEGORIES,
  CHANNEL_TABS,
  type ChannelCategory,
  type ChannelTab,
  type ModerationStatus,
  MESSAGE_MODERATION_FILTERS,
  MESSAGE_PINNED_FILTERS,
  MEMBER_ORDER_FIELDS,
  type MemberOrderField,
  categoryStyle,
  copyToClipboard,
  formatDate,
  formatDateTime,
  formatNumber,
  moderationMeta,
  onlineMeta,
  relativeTime,
  visibilityMeta,
} from '@/lib/channelAdmin';
import {
  categorizeFile,
  categoryMeta,
  formatFileSize,
} from '@/lib/filesAdmin';

/* ================================================================ */
/*  Types                                                            */
/* ================================================================ */

interface UserLite {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  onlineStatus?: string | null;
  role?: string | null;
}

interface ChannelMeta {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  visibility: string;
  category: string;
  archived: boolean;
  isVoice: boolean;
  isDM: boolean;
  inviteCode: string | null;
  ownerId: string | null;
  owner: UserLite | null;
  createdAt: string;
}

interface Overview {
  channel: ChannelMeta;
  counts: {
    messages: number;
    members: number;
    files: number;
    voiceGroups: number;
    pinned: number;
    moderation: Record<ModerationStatus, number>;
  };
  activity: {
    last24h: number;
    last7d: number;
    last30d: number;
    lastMessageAt: string | null;
    hourly: Array<{ hour: string; count: number }>;
  };
  topContributors: Array<{ user: UserLite; messages: number }>;
}

interface MessageRow {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  pinnedAt: string | null;
  unsent: boolean;
  moderationStatus: string;
  spamScore: number;
  replyToId: string | null;
  author: UserLite;
  fileCount: number;
  replyCount: number;
}

interface MemberRow {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  onlineStatus: string;
  role: string;
  isOwner: boolean;
  messagesInChannel: number;
  joinedAt: string;
}

interface FileRow {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  createdAt: string;
  uploader: UserLite | null;
  usageCount: number;
}

interface AuditRow {
  id: string;
  action: string;
  summary: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: UserLite | null;
}

/* ================================================================ */
/*  Hooks                                                            */
/* ================================================================ */

function useDebounced<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setD(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return d;
}

function useStableCallback<T extends (...a: never[]) => unknown>(cb: T): T {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  }, [cb]);
  return useCallback((...a: Parameters<T>) => ref.current(...a), []) as T;
}

/* ================================================================ */
/*  Main                                                             */
/* ================================================================ */

export default function ChannelDetail({
  channelId,
  hash,
}: {
  channelId: string;
  hash: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();

  const tab = (searchParams.get('tab') as ChannelTab) || 'overview';

  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const updateParam = useStableCallback(
    (patch: Record<string, string | number | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v == null || v === '') sp.delete(k);
        else sp.set(k, String(v));
      });
      const qs = sp.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
  );

  const setTab = useStableCallback((next: ChannelTab) => {
    updateParam({ tab: next === 'overview' ? null : next });
  });

  const fetchOverview = useStableCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await fetch(`/api/admin/channels/${channelId}/overview`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as Overview;
      setOverview(data);
    } catch (e) {
      setOverviewError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setOverviewLoading(false);
    }
  });

  useEffect(() => {
    void fetchOverview();
  }, [channelId, fetchOverview]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (e.key === 'Escape' && shortcutsOpen) {
        setShortcutsOpen(false);
        e.preventDefault();
        return;
      }
      if (editing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key === 'r') {
        e.preventDefault();
        void fetchOverview();
      } else if (e.key === 'b') {
        e.preventDefault();
        router.push(`/admin/${hash}/channels-groups`);
      } else if (e.key >= '1' && e.key <= '6') {
        const idx = Number(e.key) - 1;
        const target = CHANNEL_TABS[idx];
        if (target) {
          e.preventDefault();
          setTab(target.value);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fetchOverview, hash, router, setTab, shortcutsOpen]);

  async function toggleArchive() {
    if (!overview) return;
    const archived = !overview.channel.archived;
    const ok = await toast.confirm({
      title: archived ? 'Archive channel?' : 'Unarchive channel?',
      description: archived
        ? `#${overview.channel.name} will be hidden from default listings. Data is preserved.`
        : `#${overview.channel.name} will become visible in default listings again.`,
      confirmLabel: archived ? 'Archive' : 'Unarchive',
      tone: archived ? 'danger' : 'default',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/channels/${channelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived }),
    });
    if (res.ok) {
      toast.push({ tone: 'success', title: archived ? 'Archived' : 'Unarchived' });
      void fetchOverview();
    } else {
      toast.push({ tone: 'error', title: 'Failed' });
    }
  }

  async function deleteChannel() {
    if (!overview) return;
    const ok = await toast.confirm({
      title: `Delete #${overview.channel.name}?`,
      description: `Permanently deletes the channel and its ${overview.counts.messages.toLocaleString()} messages. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/channels/${channelId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.push({ tone: 'success', title: 'Channel deleted' });
      router.push(`/admin/${hash}/channels-groups`);
    } else {
      toast.push({ tone: 'error', title: 'Delete failed' });
    }
  }

  function copyInvite() {
    if (!overview?.channel.inviteCode) {
      toast.push({ tone: 'warning', title: 'No invite code' });
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    void copyToClipboard(`${origin}/invite/${overview.channel.inviteCode}`).then((ok) => {
      toast.push({
        tone: ok ? 'success' : 'error',
        title: ok ? 'Invite copied' : 'Copy failed',
      });
    });
  }

  /* ------------- render ------------- */

  if (overviewLoading && !overview) {
    return (
      <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#0f1014] p-6 text-foreground">
        <div className="mb-6 h-24 animate-pulse rounded-xl bg-white/5" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (overviewError || !overview) {
    return (
      <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#0f1014] p-6 text-foreground">
        <button
          onClick={() => router.push(`/admin/${hash}/channels-groups`)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to channels
        </button>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{overviewError ?? 'Channel not found'}</span>
          </div>
          <button
            onClick={() => void fetchOverview()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      </div>
    );
  }

  const channel = overview.channel;
  const vis = visibilityMeta(channel.visibility);
  const VisIcon = vis.icon;

  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono ${vis.className}`}>
        <VisIcon className="h-3 w-3" />
        {vis.label}
      </span>
      <span className={`rounded px-1.5 py-0.5 ${categoryStyle(channel.category)}`}>
        {channel.category}
      </span>
      {channel.archived && (
        <span className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-muted-foreground">
          <Archive className="h-3 w-3" /> Archived
        </span>
      )}
      <span className="font-mono text-[11px] text-foreground">{channel.slug}</span>
      <span>Created {formatDate(channel.createdAt)}</span>
    </div>
  );

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#0f1014] p-6 text-foreground">
      <button
        onClick={() => router.push(`/admin/${hash}/channels-groups`)}
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        title="Back (b)"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Channels
      </button>

      <AdminHeader
        title={`#${channel.name}`}
        description={channel.topic || 'No topic set'}
        icon={Hash}
        iconTone="primary"
        meta={meta}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchOverview()}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:bg-white/10"
              title="Refresh (r)"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${overviewLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {channel.inviteCode && (
              <button
                type="button"
                onClick={copyInvite}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:bg-white/10"
              >
                <Copy className="h-3.5 w-3.5" /> Copy invite
              </button>
            )}
            <button
              type="button"
              onClick={toggleArchive}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:bg-white/10"
            >
              {channel.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
              {channel.archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              type="button"
              onClick={deleteChannel}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:bg-white/10"
              title="Shortcuts (?)"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />

      <TabBar active={tab} onChange={setTab} counts={overview.counts} />

      <div className="mt-6">
        {tab === 'overview' && <OverviewTab overview={overview} onJump={setTab} />}
        {tab === 'messages' && (
          <MessagesTab channelId={channelId} onRefreshOverview={fetchOverview} />
        )}
        {tab === 'members' && <MembersTab channelId={channelId} ownerId={channel.ownerId} />}
        {tab === 'files' && <FilesTab channelId={channelId} />}
        {tab === 'settings' && (
          <SettingsTab
            channel={channel}
            onSaved={fetchOverview}
          />
        )}
        {tab === 'audit' && <AuditTab channelId={channelId} />}
      </div>

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}

/* ================================================================ */
/*  Tab Bar                                                          */
/* ================================================================ */

function TabBar({
  active,
  onChange,
  counts,
}: {
  active: ChannelTab;
  onChange: (t: ChannelTab) => void;
  counts: Overview['counts'];
}) {
  const countFor = (tab: ChannelTab): number | null => {
    if (tab === 'messages') return counts.messages;
    if (tab === 'members') return counts.members;
    if (tab === 'files') return counts.files;
    return null;
  };
  return (
    <div className="mt-6 flex items-center gap-1 overflow-x-auto border-b border-white/10">
      {CHANNEL_TABS.map(({ value, label, icon: Icon }, i) => {
        const isActive = active === value;
        const count = countFor(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            title={`${label} (${i + 1})`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count != null && (
              <span className="tabular-nums rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================ */
/*  Overview Tab                                                     */
/* ================================================================ */

function OverviewTab({
  overview,
  onJump,
}: {
  overview: Overview;
  onJump: (t: ChannelTab) => void;
}) {
  const peak = Math.max(1, ...overview.activity.hourly.map((h) => h.count));

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          icon={MessageSquare}
          label="Messages"
          value={overview.counts.messages}
          hint={`${overview.activity.last24h} in the last 24h`}
          onClick={() => onJump('messages')}
        />
        <MetricCard
          icon={Users}
          label="Members"
          value={overview.counts.members}
          hint={overview.channel.owner ? `Owned by ${overview.channel.owner.name || '—'}` : 'No owner'}
          onClick={() => onJump('members')}
        />
        <MetricCard
          icon={FileText}
          label="Files"
          value={overview.counts.files}
          hint={overview.counts.voiceGroups > 0 ? `${overview.counts.voiceGroups} voice groups` : 'No voice groups'}
          onClick={() => onJump('files')}
        />
        <MetricCard
          icon={Pin}
          label="Pinned"
          value={overview.counts.pinned}
          hint={
            overview.activity.lastMessageAt
              ? `Last message ${relativeTime(overview.activity.lastMessageAt)}`
              : 'No activity'
          }
          onClick={() => onJump('messages')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Activity chart */}
        <section className="lg:col-span-3 rounded-xl border border-white/10 bg-[#16181d] p-4">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">24h activity</h2>
              <p className="text-xs text-muted-foreground">Messages per hour · oldest → newest</p>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>
                24h: <strong className="font-semibold text-foreground">{overview.activity.last24h}</strong>
              </span>
              <span>
                7d: <strong className="font-semibold text-foreground">{overview.activity.last7d}</strong>
              </span>
              <span>
                30d: <strong className="font-semibold text-foreground">{overview.activity.last30d}</strong>
              </span>
            </div>
          </header>
          <div className="flex h-40 items-end gap-0.5">
            {overview.activity.hourly.map((h) => {
              const pct = (h.count / peak) * 100;
              const date = new Date(h.hour);
              const label = date.toLocaleTimeString(undefined, { hour: '2-digit' });
              return (
                <div key={h.hour} className="group relative flex-1" title={`${label}: ${h.count} messages`}>
                  <div
                    className="w-full rounded-sm bg-primary/50 transition-colors group-hover:bg-primary"
                    style={{ height: `${Math.max(2, pct)}%` }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 -top-8 hidden text-center text-[10px] text-muted-foreground group-hover:block">
                    {h.count}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top contributors */}
        <section className="lg:col-span-2 rounded-xl border border-white/10 bg-[#16181d] p-4">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Top contributors</h2>
              <p className="text-xs text-muted-foreground">By message count</p>
            </div>
          </header>
          {overview.topContributors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity yet</p>
          ) : (
            <ul className="space-y-2">
              {overview.topContributors.map((c, i) => (
                <li key={c.user.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                  <Avatar user={c.user} size={7} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">
                      {c.user.name || c.user.username || c.user.email || c.user.id}
                    </div>
                    {c.user.username && (
                      <div className="truncate text-xs text-muted-foreground">@{c.user.username}</div>
                    )}
                  </div>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {c.messages.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Moderation split */}
      <section className="rounded-xl border border-white/10 bg-[#16181d] p-4">
        <header className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Message moderation</h2>
          <p className="text-xs text-muted-foreground">Breakdown of messages by status</p>
        </header>
        <div className="grid gap-3 md:grid-cols-4">
          <ModChip label="Pending" value={overview.counts.moderation.pending} status="pending" />
          <ModChip label="Approved" value={overview.counts.moderation.approved} status="approved" />
          <ModChip label="Flagged" value={overview.counts.moderation.flagged} status="flagged" />
          <ModChip label="Rejected" value={overview.counts.moderation.rejected} status="rejected" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-[#16181d] p-4 text-left transition-colors hover:bg-[#1a1b23]"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
        {value.toLocaleString()}
      </div>
      {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
    </button>
  );
}

function ModChip({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: ModerationStatus;
}) {
  const { className } = moderationMeta(status);
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <div className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${className}`}>
        {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold text-foreground tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Messages Tab                                                     */
/* ================================================================ */

function MessagesTab({
  channelId,
  onRefreshOverview,
}: {
  channelId: string;
  onRefreshOverview: () => void;
}) {
  const toast = useAdminToast();
  const [search, setSearch] = useState('');
  const debouncedQ = useDebounced(search, 300);
  const [moderation, setModeration] = useState<'all' | ModerationStatus>('all');
  const [pinned, setPinned] = useState<'all' | 'pinned' | 'unpinned'>('all');
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchMessages = useStableCallback(async (append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set('q', debouncedQ);
      if (moderation !== 'all') params.set('moderation', moderation);
      if (pinned !== 'all') params.set('pinned', pinned);
      params.set('limit', '50');
      if (append && cursor) params.set('before', cursor);
      const res = await fetch(`/api/admin/channels/${channelId}/messages?${params}`);
      if (!res.ok) {
        throw new Error('Fetch failed');
      }
      const data = await res.json();
      const rows = (data.messages as MessageRow[]) ?? [];
      setMessages((prev) => (append ? [...prev, ...rows] : rows));
      setCursor(data.pagination?.nextCursor ?? null);
      setHasMore(Boolean(data.pagination?.hasMore));
    } catch {
      toast.push({ tone: 'error', title: 'Failed to load messages' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  });

  useEffect(() => {
    setCursor(null);
    void fetchMessages(false);
    setSelected(new Set());
  }, [debouncedQ, moderation, pinned, fetchMessages]);

  async function doDelete(ids: string[]) {
    if (ids.length === 0) return;
    const ok = await toast.confirm({
      title: `Delete ${ids.length} message${ids.length === 1 ? '' : 's'}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/channels/${channelId}/messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: ids }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.push({
        tone: 'success',
        title: `${data.deleted} deleted`,
      });
      setSelected(new Set());
      void fetchMessages(false);
      onRefreshOverview();
    } else {
      toast.push({ tone: 'error', title: 'Delete failed' });
    }
  }

  async function patchMessage(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/channels/${channelId}/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      void fetchMessages(false);
      onRefreshOverview();
      return true;
    }
    return false;
  }

  async function togglePin(m: MessageRow) {
    const ok = await patchMessage(m.id, { action: m.pinnedAt ? 'unpin' : 'pin' });
    if (ok) {
      toast.push({ tone: 'success', title: m.pinnedAt ? 'Unpinned' : 'Pinned' });
    } else {
      toast.push({ tone: 'error', title: 'Failed' });
    }
  }

  async function moderate(m: MessageRow, status: ModerationStatus) {
    const ok = await patchMessage(m.id, { action: 'moderate', moderationStatus: status });
    if (ok) {
      toast.push({ tone: 'success', title: `Set to ${status}` });
    } else {
      toast.push({ tone: 'error', title: 'Failed' });
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(messages.map((m) => m.id)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#16181d] p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <SelectNative
          value={moderation}
          onChange={(v) => setModeration(v as 'all' | ModerationStatus)}
          options={MESSAGE_MODERATION_FILTERS}
        />
        <SelectNative
          value={pinned}
          onChange={(v) => setPinned(v as 'all' | 'pinned' | 'unpinned')}
          options={MESSAGE_PINNED_FILTERS}
        />
        <button
          type="button"
          onClick={() => void fetchMessages(false)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground transition hover:bg-white/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <BulkActionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        label={selected.size === 1 ? 'message selected' : 'messages selected'}
        actions={[
          {
            label: 'Delete selected',
            icon: Trash2,
            tone: 'error',
            onClick: () => doDelete(Array.from(selected)),
          },
        ]}
      />

      {loading && messages.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState label="No messages match these filters" />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 transition hover:bg-white/10"
            >
              Select all visible
            </button>
            <span>
              {messages.length} message{messages.length === 1 ? '' : 's'} loaded
            </span>
          </div>
          {messages.map((m) => (
            <MessageCard
              key={m.id}
              message={m}
              selected={selected.has(m.id)}
              onToggleSelect={() => toggleSelect(m.id)}
              onTogglePin={() => togglePin(m)}
              onModerate={(s) => moderate(m, s)}
              onDelete={() => doDelete([m.id])}
            />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => void fetchMessages(true)}
              disabled={loadingMore}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-foreground transition hover:bg-white/10 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MessageCard({
  message,
  selected,
  onToggleSelect,
  onTogglePin,
  onModerate,
  onDelete,
}: {
  message: MessageRow;
  selected: boolean;
  onToggleSelect: () => void;
  onTogglePin: () => void;
  onModerate: (s: ModerationStatus) => void;
  onDelete: () => void;
}) {
  const mod = moderationMeta(message.moderationStatus);
  return (
    <article
      className={`rounded-lg border p-3 transition-colors ${
        selected ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-[#16181d]'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 accent-primary"
          aria-label="Select message"
        />
        <Avatar user={message.author} size={8} />
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-foreground">
              {message.author.name || message.author.username || 'Unknown'}
            </span>
            {message.author.username && (
              <span className="text-xs text-muted-foreground">@{message.author.username}</span>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <time
              className="text-xs text-muted-foreground"
              title={new Date(message.createdAt).toLocaleString()}
            >
              {relativeTime(message.createdAt)}
            </time>
            {message.editedAt && (
              <span className="text-xs text-muted-foreground">· edited</span>
            )}
            {message.pinnedAt && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
            <span className={`rounded px-1.5 py-0.5 text-[10px] ${mod.className}`}>
              {mod.label}
            </span>
            {message.unsent && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Unsent
              </span>
            )}
            {message.fileCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <FileText className="h-3 w-3" /> {message.fileCount}
              </span>
            )}
          </header>
          <p className={`mt-1.5 whitespace-pre-wrap break-words text-sm ${message.unsent ? 'italic text-muted-foreground' : 'text-foreground'}`}>
            {message.unsent ? '[message unsent]' : message.content}
          </p>
          {message.spamScore >= 0.5 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-rose-300">
              <AlertTriangle className="h-3 w-3" /> Spam score {message.spamScore.toFixed(2)}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <IconButton onClick={onTogglePin} title={message.pinnedAt ? 'Unpin' : 'Pin'}>
            {message.pinnedAt ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </IconButton>
          <Menu
            items={[
              {
                label: 'Mark approved',
                icon: Check,
                onClick: () => onModerate('approved'),
              },
              {
                label: 'Mark pending',
                icon: Clock,
                onClick: () => onModerate('pending'),
              },
              {
                label: 'Flag message',
                icon: Flag,
                onClick: () => onModerate('flagged'),
                tone: 'warning',
              },
              {
                label: 'Reject',
                icon: X,
                onClick: () => onModerate('rejected'),
                tone: 'danger',
              },
            ]}
          />
          <IconButton onClick={onDelete} title="Delete" tone="danger">
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
    </article>
  );
}

/* ================================================================ */
/*  Members Tab                                                      */
/* ================================================================ */

function MembersTab({ channelId, ownerId }: { channelId: string; ownerId: string | null }) {
  const toast = useAdminToast();
  const [search, setSearch] = useState('');
  const debouncedQ = useDebounced(search, 300);
  const [role, setRole] = useState<'all' | 'user' | 'admin' | 'super-admin'>('all');
  const [online, setOnline] = useState<'all' | 'online' | 'offline'>('all');
  const [orderBy, setOrderBy] = useState<MemberOrderField>('name');
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useStableCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQ,
        role,
        online,
        orderBy,
        orderDir,
        page: String(page),
        limit: '50',
      });
      const res = await fetch(`/api/admin/channels/${channelId}/members?${params}`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setMembers((data.members as MemberRow[]) ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch {
      toast.push({ tone: 'error', title: 'Failed to load members' });
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void fetchMembers();
  }, [debouncedQ, role, online, orderBy, orderDir, page, fetchMembers]);

  function exportCsv() {
    if (members.length === 0) {
      toast.push({ tone: 'info', title: 'Nothing to export' });
      return;
    }
    downloadCSV(`channel-${channelId}-members-${new Date().toISOString().slice(0, 10)}`, members.map((m) => ({
      id: m.id,
      name: m.name ?? '',
      username: m.username ?? '',
      email: m.email ?? '',
      role: m.role,
      isOwner: m.isOwner ? 'true' : 'false',
      onlineStatus: m.onlineStatus,
      messagesInChannel: m.messagesInChannel,
      memberSince: m.joinedAt,
    })));
  }

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#16181d] p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, username, email…"
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <SelectNative
          value={role}
          onChange={(v) => {
            setRole(v as 'all' | 'user' | 'admin' | 'super-admin');
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All roles' },
            { value: 'user', label: 'Users' },
            { value: 'admin', label: 'Admins' },
            { value: 'super-admin', label: 'Super admins' },
          ]}
        />
        <SelectNative
          value={online}
          onChange={(v) => {
            setOnline(v as 'all' | 'online' | 'offline');
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'online', label: 'Online' },
            { value: 'offline', label: 'Offline' },
          ]}
        />
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground transition hover:bg-white/10"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {loading && members.length === 0 ? (
        <div className="h-64 animate-pulse rounded-lg bg-white/5" />
      ) : members.length === 0 ? (
        <EmptyState label="No members match these filters" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#16181d]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#14161b] text-xs text-muted-foreground">
                <tr>
                  <SortTh field="name" label="Member" current={orderBy} dir={orderDir} onSort={setOrderBy} onFlip={setOrderDir} />
                  <SortTh field="username" label="Username" current={orderBy} dir={orderDir} onSort={setOrderBy} onFlip={setOrderDir} />
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <SortTh field="messages" label="Messages" current={orderBy} dir={orderDir} onSort={setOrderBy} onFlip={setOrderDir} />
                  <SortTh field="joinedAt" label="Member since" current={orderBy} dir={orderDir} onSort={setOrderBy} onFlip={setOrderDir} />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((m) => {
                  const onlineData = onlineMeta(m.onlineStatus);
                  return (
                    <tr key={m.id} className="transition-colors hover:bg-white/5">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar user={m} size={7} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="truncate text-foreground">
                                {m.name || '—'}
                              </span>
                              {m.isOwner && (
                                <span title="Channel owner">
                                  <Crown className="h-3 w-3 text-amber-300" />
                                </span>
                              )}
                            </div>
                            {m.email && (
                              <div className="truncate text-xs text-muted-foreground">
                                {m.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {m.username ? `@${m.username}` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            m.role === 'super-admin'
                              ? 'bg-violet-500/10 text-violet-300'
                              : m.role === 'admin'
                                ? 'bg-sky-500/10 text-sky-300'
                                : 'bg-white/5 text-muted-foreground'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`h-2 w-2 rounded-full ${onlineData.dot}`} />
                          {onlineData.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-foreground">
                        {m.messagesInChannel.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(m.joinedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pager page={page} pages={pages} total={total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

/* ================================================================ */
/*  Files Tab                                                        */
/* ================================================================ */

function FilesTab({ channelId }: { channelId: string }) {
  const toast = useAdminToast();
  const [search, setSearch] = useState('');
  const debouncedQ = useDebounced(search, 300);
  const [orderBy, setOrderBy] = useState<'createdAt' | 'fileName' | 'fileSize'>('createdAt');
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('desc');
  const [rows, setRows] = useState<FileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useStableCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQ,
        orderBy,
        orderDir,
        page: String(page),
        limit: '50',
      });
      const res = await fetch(`/api/admin/channels/${channelId}/files?${params}`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setRows((data.files as FileRow[]) ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch {
      toast.push({ tone: 'error', title: 'Failed to load files' });
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void fetchFiles();
  }, [debouncedQ, orderBy, orderDir, page, fetchFiles]);

  async function deleteFile(f: FileRow) {
    const ok = await toast.confirm({
      title: `Delete ${f.fileName}?`,
      description: 'Removes the file from S3 and the database.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch('/api/admin/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets: [{ id: f.id, source: 'channel' }] }),
    });
    if (res.ok) {
      toast.push({ tone: 'success', title: 'File deleted' });
      void fetchFiles();
    } else {
      toast.push({ tone: 'error', title: 'Delete failed' });
    }
  }

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#16181d] p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or type…"
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          type="button"
          onClick={() => void fetchFiles()}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground transition hover:bg-white/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="h-64 animate-pulse rounded-lg bg-white/5" />
      ) : rows.length === 0 ? (
        <EmptyState label="No files in this channel" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#16181d]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#14161b] text-xs text-muted-foreground">
                <tr>
                  <SortTh field="fileName" label="File" current={orderBy} dir={orderDir} onSort={setOrderBy} onFlip={setOrderDir} />
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <SortTh field="fileSize" label="Size" current={orderBy} dir={orderDir} onSort={setOrderBy} onFlip={setOrderDir} />
                  <th className="px-3 py-2 text-left font-medium">Uploader</th>
                  <th className="px-3 py-2 text-left font-medium">Used in</th>
                  <SortTh field="createdAt" label="Uploaded" current={orderBy} dir={orderDir} onSort={setOrderBy} onFlip={setOrderDir} />
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((f) => {
                  const cat = categorizeFile(f.fileType, f.fileName);
                  const catData = categoryMeta(cat);
                  const CatIcon = catData.icon;
                  return (
                    <tr key={f.id} className="transition-colors hover:bg-white/5">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded p-1 ${catData.className}`}>
                            <CatIcon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-foreground">{f.fileName}</div>
                            <div className="truncate font-mono text-[10px] text-muted-foreground">{f.s3Key}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{f.fileType}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {formatFileSize(f.fileSize)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {f.uploader
                          ? f.uploader.name || f.uploader.username || f.uploader.email || '—'
                          : '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {f.usageCount}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {relativeTime(f.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => deleteFile(f)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={page} pages={pages} total={total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

/* ================================================================ */
/*  Settings Tab                                                     */
/* ================================================================ */

function SettingsTab({
  channel,
  onSaved,
}: {
  channel: ChannelMeta;
  onSaved: () => void;
}) {
  const toast = useAdminToast();
  const [name, setName] = useState(channel.name);
  const [topic, setTopic] = useState(channel.topic ?? '');
  const [visibility, setVisibility] = useState(channel.visibility);
  const [category, setCategory] = useState(channel.category);
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== channel.name ||
    topic !== (channel.topic ?? '') ||
    visibility !== channel.visibility ||
    category !== channel.category;

  async function save() {
    if (!name.trim()) {
      toast.push({ tone: 'error', title: 'Name required' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/channels/${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, topic, visibility, category }),
      });
      if (res.ok) {
        toast.push({ tone: 'success', title: 'Settings saved' });
        onSaved();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Save failed', description: err.error });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <section className="rounded-xl border border-white/10 bg-[#16181d] p-5">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Channel settings</h2>
          <p className="text-xs text-muted-foreground">
            Changes take effect immediately. Slug is regenerated from the name.
          </p>
        </header>
        <div className="space-y-4">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </Field>
          <Field label="Topic">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
              className="w-full resize-y rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Short description visible to members"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visibility">
              <SelectNative
                value={visibility}
                onChange={setVisibility}
                options={[
                  { value: 'public', label: 'Public' },
                  { value: 'private', label: 'Private' },
                ]}
              />
            </Field>
            <Field label="Category">
              <SelectNative
                value={category}
                onChange={(v) => setCategory(v as ChannelCategory)}
                options={CHANNEL_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setName(channel.name);
                setTopic(channel.topic ?? '');
                setVisibility(channel.visibility);
                setCategory(channel.category);
              }}
              disabled={!dirty || saving}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/10 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/15 px-3 py-1.5 text-sm text-primary transition hover:bg-primary/25 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#16181d] p-5">
        <header className="mb-3">
          <h2 className="text-base font-semibold text-foreground">Identity</h2>
          <p className="text-xs text-muted-foreground">
            Immutable identifiers. Useful for support and deep linking.
          </p>
        </header>
        <dl className="grid gap-2 text-sm">
          <Kv label="Channel ID" value={channel.id} mono />
          <Kv label="Slug" value={channel.slug} mono />
          <Kv
            label="Invite code"
            value={channel.inviteCode || 'None'}
            mono={Boolean(channel.inviteCode)}
          />
          <Kv label="Created" value={formatDateTime(channel.createdAt)} />
        </dl>
      </section>
    </div>
  );
}

/* ================================================================ */
/*  Audit Tab                                                        */
/* ================================================================ */

function AuditTab({ channelId }: { channelId: string }) {
  const [events, setEvents] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudit = useStableCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/channels/${channelId}/audit?limit=100`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setEvents((data.events as AuditRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void fetchAudit();
  }, [fetchAudit]);

  if (loading && events.length === 0) {
    return <div className="h-64 animate-pulse rounded-lg bg-white/5" />;
  }
  if (events.length === 0) {
    return <EmptyState label="No admin actions recorded for this channel" />;
  }

  return (
    <ol className="relative ml-4 space-y-4 border-l border-white/10 pl-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
          <div className="rounded-lg border border-white/10 bg-[#16181d] p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{e.action}</span>
              <span className="text-muted-foreground">·</span>
              <time className="text-xs text-muted-foreground" title={new Date(e.createdAt).toLocaleString()}>
                {relativeTime(e.createdAt)}
              </time>
              {e.admin && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-foreground">
                    <Avatar user={e.admin} size={5} />
                    {e.admin.name || e.admin.username || e.admin.email}
                  </span>
                </>
              )}
            </div>
            {e.summary && <p className="mt-1 text-sm text-foreground">{e.summary}</p>}
            {e.metadata != null && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  metadata
                </summary>
                <pre className="mt-1 max-h-48 overflow-auto rounded bg-black/30 p-2 text-[11px] text-muted-foreground">
                  {JSON.stringify(e.metadata, null, 2)}
                </pre>
              </details>
            )}
            {(e.ip || e.userAgent) && (
              <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
                {e.ip && <span>IP {e.ip}</span>}
                {e.userAgent && <span className="truncate">UA {e.userAgent}</span>}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ================================================================ */
/*  Shared atoms                                                     */
/* ================================================================ */

function Avatar({ user, size = 8 }: { user: UserLite; size?: 5 | 6 | 7 | 8 | 10 }) {
  const sizeCls: Record<number, string> = {
    5: 'h-5 w-5 text-[9px]',
    6: 'h-6 w-6 text-[10px]',
    7: 'h-7 w-7 text-[11px]',
    8: 'h-8 w-8 text-xs',
    10: 'h-10 w-10 text-sm',
  };
  const cls = sizeCls[size] ?? sizeCls[8]!;
  const initials =
    (user.name || user.username || user.email || 'U').slice(0, 1).toUpperCase();
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt=""
        className={`${cls} shrink-0 rounded-full border border-white/10 object-cover`}
      />
    );
  }
  return (
    <div
      className={`${cls} shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold uppercase`}
    >
      {initials}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  tone = 'neutral',
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  tone?: 'neutral' | 'danger';
}) {
  const base =
    tone === 'danger'
      ? 'border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/15'
      : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-md border px-1.5 py-1 transition-colors ${base}`}
    >
      {children}
    </button>
  );
}

function Menu({
  items,
}: {
  items: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    tone?: 'default' | 'warning' | 'danger';
  }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <IconButton onClick={() => setOpen((v) => !v)} title="More actions">
        <MoreHorizontal className="h-3.5 w-3.5" />
      </IconButton>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-white/10 bg-[#1a1b23] shadow-xl">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const toneCls =
              item.tone === 'danger'
                ? 'text-red-300 hover:bg-red-500/10'
                : item.tone === 'warning'
                  ? 'text-amber-300 hover:bg-amber-500/10'
                  : 'text-foreground hover:bg-white/5';
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${toneCls}`}
              >
                <ItemIcon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectNative<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#1a1b23]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SortTh<F extends string>({
  field,
  label,
  current,
  dir,
  onSort,
  onFlip,
}: {
  field: F;
  label: string;
  current: F;
  dir: 'asc' | 'desc';
  onSort: (f: F) => void;
  onFlip: (d: 'asc' | 'desc') => void;
}) {
  const active = current === field;
  return (
    <th className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={() => {
          if (active) onFlip(dir === 'asc' ? 'desc' : 'asc');
          else onSort(field);
        }}
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        {label}
        {active && <span className="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}

function Pager({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/10 bg-[#14161b] px-3 py-2 text-xs text-muted-foreground">
      <span>
        Page <strong className="font-semibold text-foreground tabular-nums">{page}</strong> of {pages} ·{' '}
        <strong className="font-semibold text-foreground tabular-nums">{total}</strong> total
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-md border border-white/10 bg-white/5 p-1 transition hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded-md border border-white/10 bg-white/5 p-1 transition hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-[#16181d] py-16 text-center">
      <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Kv({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const toast = useAdminToast();
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`flex items-center gap-2 text-sm text-foreground ${mono ? 'font-mono text-xs' : ''}`}>
        <span className="truncate max-w-[320px]">{value}</span>
        <button
          type="button"
          onClick={() =>
            void copyToClipboard(value).then((ok) =>
              toast.push({
                tone: ok ? 'success' : 'error',
                title: ok ? 'Copied' : 'Copy failed',
              }),
            )
          }
          className="rounded p-0.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-3 w-3" />
        </button>
      </dd>
    </div>
  );
}

/* ================================================================ */
/*  Shortcuts dialog                                                 */
/* ================================================================ */

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16181d] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Keyboard shortcuts</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <dl className="space-y-2 text-sm">
          <Shortcut keys={['r']} label="Refresh overview" />
          <Shortcut keys={['b']} label="Back to channel list" />
          <Shortcut keys={['1']} label="Overview tab" />
          <Shortcut keys={['2']} label="Messages tab" />
          <Shortcut keys={['3']} label="Members tab" />
          <Shortcut keys={['4']} label="Files tab" />
          <Shortcut keys={['5']} label="Settings tab" />
          <Shortcut keys={['6']} label="Audit tab" />
          <Shortcut keys={['?']} label="Show this help" />
          <Shortcut keys={['Esc']} label="Close dialog" />
        </dl>
      </div>
    </div>,
    document.body,
  );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="rounded-md border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] font-mono text-foreground"
          >
            {k}
          </kbd>
        ))}
      </dd>
    </div>
  );
}
