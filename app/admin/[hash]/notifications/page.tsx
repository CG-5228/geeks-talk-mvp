'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Eye,
  EyeOff,
  Keyboard,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  User as UserIcon,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';

import AdminHeader from '@/components/admin/AdminHeader';
import BulkActionBar from '@/components/admin/BulkActionBar';
import { useAdminToast } from '@/components/admin/AdminToast';
import {
  notificationAbsoluteDate,
  notificationRelativeAge,
  NOTIFICATION_TYPE_META,
  notificationTypeLabel,
  resolveNotificationType,
  type NotificationTypeKey,
} from '@/lib/notificationAdmin';
import ReviewModal from './ReviewModal';
import ReplyModal from './ReplyModal';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string | null; email: string | null } | null;
}

interface Stats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

type ReadFilter = 'all' | 'unread' | 'read';
type TypeFilter = 'all' | NotificationTypeKey;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();

  const urlRead = (searchParams.get('read') as ReadFilter) || 'all';
  const urlType = (searchParams.get('type') as TypeFilter) || 'all';
  const urlQ = searchParams.get('q') || '';

  const [readFilter, setReadFilter] = useState<ReadFilter>(urlRead);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(urlType);
  const [searchText, setSearchText] = useState(urlQ);
  const debouncedSearch = useDebounced(searchText, 300);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, unread: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [reviewReportId, setReviewReportId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<{
    userId: string;
    userName?: string;
    originalMessage?: string;
  } | null>(null);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (readFilter !== 'all') params.set('read', readFilter === 'read' ? 'true' : 'false');
    if (typeFilter !== 'all') params.set('type', typeFilter);
    return params;
  }, [readFilter, typeFilter]);

  const buildUrlQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (readFilter !== 'all') params.set('read', readFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    return params;
  }, [readFilter, typeFilter, debouncedSearch]);

  const fetchNotifications = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setRefreshing(true);
      setError(null);
      try {
        const params = buildQuery();
        params.set('limit', '200');
        const res = await fetch(`/api/admin/notifications?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        setNotifications(data.notifications || []);
        setStats(data.stats || { total: 0, unread: 0, byType: {} });
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQuery],
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const qs = buildUrlQuery().toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [buildUrlQuery, router]);

  const filteredNotifications = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.user?.name || '').toLowerCase().includes(q),
    );
  }, [notifications, debouncedSearch]);

  const readOnServer = async (ids: string[], read: boolean) => {
    const snapshot = notifications;
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read } : n)),
    );
    setStats((prev) => {
      const delta = ids.reduce((acc, id) => {
        const was = snapshot.find((n) => n.id === id);
        if (!was) return acc;
        if (read && !was.read) return acc + 1;
        if (!read && was.read) return acc - 1;
        return acc;
      }, 0);
      return { ...prev, unread: Math.max(0, prev.unread - delta) };
    });

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids, read }),
      });
      if (!res.ok) throw new Error('Update failed');
    } catch (err) {
      setNotifications(snapshot);
      toast.push({
        tone: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    }
  };

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const selectedInView = filteredNotifications.filter((n) => selectedIds.has(n.id));

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allIn =
        filteredNotifications.length > 0 &&
        filteredNotifications.every((n) => prev.has(n.id));
      const next = new Set(prev);
      if (allIn) filteredNotifications.forEach((n) => next.delete(n.id));
      else filteredNotifications.forEach((n) => next.add(n.id));
      return next;
    });
  };

  const bulkMarkRead = async (read: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await readOnServer(Array.from(selectedIds), read);
      toast.push({
        tone: 'success',
        title: `${selectedIds.size} notification${selectedIds.size === 1 ? '' : 's'} marked ${
          read ? 'read' : 'unread'
        }`,
      });
      clearSelection();
    } finally {
      setBulkUpdating(false);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unread.length === 0) return;
    const ok = await toast.confirm({
      title: `Mark ${unread.length} notification${unread.length === 1 ? '' : 's'} as read?`,
      confirmLabel: 'Mark all read',
    });
    if (!ok) return;
    await readOnServer(unread, true);
    toast.push({ tone: 'success', title: `${unread.length} marked read` });
  };

  const openReview = (reportId?: string) => {
    if (!reportId) {
      toast.push({ tone: 'warning', title: 'Missing reportId in notification metadata' });
      return;
    }
    setReviewReportId(reportId);
  };

  const openReply = (userId?: string, userName?: string, originalMessage?: string) => {
    if (!userId) {
      toast.push({ tone: 'warning', title: 'Missing reporterId in notification metadata' });
      return;
    }
    setReplyTarget({ userId, userName, originalMessage });
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
          e.preventDefault();
          return;
        }
      }
      if (inField) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const map: ReadFilter[] = ['all', 'unread', 'read'];
        setReadFilter(map[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showShortcuts]);

  const typeOptions: TypeFilter[] = useMemo(() => {
    const set = new Set<TypeFilter>(['all']);
    for (const key of Object.keys(stats.byType)) {
      set.add(resolveNotificationType(key));
    }
    return Array.from(set);
  }, [stats.byType]);

  return (
    <div className="min-h-dvh p-6">
      <AdminHeader
        title="Notifications"
        description="Admin-scoped notifications: admin messages, bans, system events, and user reports."
        icon={Bell}
        iconTone="info"
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <strong className="text-foreground">{stats.total.toLocaleString()}</strong> total
            </span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="tabular-nums">
              <strong className="text-red-300">{stats.unread}</strong> unread
            </span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="tabular-nums">
              <strong className="text-emerald-300">{stats.total - stats.unread}</strong> read
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-3.5 w-3.5" />
              Shortcuts
            </button>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={stats.unread === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
            <button
              type="button"
              onClick={() => fetchNotifications()}
              disabled={refreshing}
              aria-busy={refreshing}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-foreground transition hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="sticky top-0 z-10 mb-4 -mx-6 px-6 py-3 border-b border-white/10 bg-background/90 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#16181d] px-3 py-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search notifications by title, body, or user…   (press /)"
              aria-label="Search notifications"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                aria-label="Clear search"
                className="rounded p-0.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#16181d] px-3 py-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="bg-transparent text-xs text-foreground focus:outline-none"
              aria-label="Filter by type"
            >
              {typeOptions.map((t) => (
                <option key={t} value={t} className="bg-[#16181d]">
                  {t === 'all' ? 'All types' : notificationTypeLabel(t)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Read status">
          <ReadTab label="All" count={stats.total} active={readFilter === 'all'} onClick={() => setReadFilter('all')} />
          <ReadTab
            label="Unread"
            count={stats.unread}
            active={readFilter === 'unread'}
            tone="danger"
            onClick={() => setReadFilter('unread')}
          />
          <ReadTab
            label="Read"
            count={Math.max(0, stats.total - stats.unread)}
            active={readFilter === 'read'}
            tone="success"
            onClick={() => setReadFilter('read')}
          />
        </div>
      </div>

      <BulkActionBar
        count={selectedIds.size}
        onClear={clearSelection}
        label={selectedIds.size === 1 ? 'notification selected' : 'notifications selected'}
        actions={[
          {
            label: 'Mark read',
            icon: Eye,
            tone: 'success',
            onClick: () => bulkMarkRead(true),
            disabled: bulkUpdating,
          },
          {
            label: 'Mark unread',
            icon: EyeOff,
            tone: 'neutral',
            onClick: () => bulkMarkRead(false),
            disabled: bulkUpdating,
          },
        ]}
      />

      <section className="rounded-xl border border-white/10 bg-[#16181d]">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5 text-xs text-muted-foreground">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={
                filteredNotifications.length > 0 &&
                filteredNotifications.every((n) => selectedIds.has(n.id))
              }
              ref={(el) => {
                if (!el) return;
                const some = filteredNotifications.some((n) => selectedIds.has(n.id));
                const all =
                  filteredNotifications.length > 0 &&
                  filteredNotifications.every((n) => selectedIds.has(n.id));
                el.indeterminate = some && !all;
              }}
              onChange={toggleSelectAllVisible}
              className="h-3.5 w-3.5 rounded accent-primary"
              aria-label="Select all visible notifications"
            />
            {selectedInView.length > 0
              ? `${selectedInView.length} of ${filteredNotifications.length} selected`
              : `${filteredNotifications.length} ${
                  filteredNotifications.length === 1 ? 'notification' : 'notifications'
                }`}
          </label>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchNotifications()} />
        ) : filteredNotifications.length === 0 ? (
          <EmptyListState
            readFilter={readFilter}
            typeFilter={typeFilter}
            q={debouncedSearch}
            onReset={() => {
              setReadFilter('all');
              setTypeFilter('all');
              setSearchText('');
            }}
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredNotifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                checked={selectedIds.has(n.id)}
                onToggleCheck={() => toggleSelected(n.id)}
                onToggleRead={() => readOnServer([n.id], !n.read)}
                onOpenReview={openReview}
                onOpenReply={openReply}
              />
            ))}
          </ul>
        )}
      </section>

      {reviewReportId && (
        <ReviewModal reportId={reviewReportId} onClose={() => setReviewReportId(null)} />
      )}
      {replyTarget && (
        <ReplyModal
          userId={replyTarget.userId}
          userName={replyTarget.userName}
          originalMessage={replyTarget.originalMessage}
          onClose={() => setReplyTarget(null)}
        />
      )}
      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

/* ----------------------------- Components ------------------------------- */

function ReadTab({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: 'danger' | 'success';
  onClick: () => void;
}) {
  const activeChip =
    tone === 'danger'
      ? 'border-red-500/40 bg-red-500/15 text-red-300'
      : tone === 'success'
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
      : 'border-primary/40 bg-primary/15 text-primary';
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? activeChip
          : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
      }`}
    >
      {label}
      <span
        className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
          active ? 'bg-black/20' : 'bg-white/10 text-muted-foreground'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

interface NotificationRowProps {
  notification: Notification;
  checked: boolean;
  onToggleCheck: () => void;
  onToggleRead: () => void;
  onOpenReview: (reportId?: string) => void;
  onOpenReply: (userId?: string, userName?: string, originalMessage?: string) => void;
}

function NotificationRow({
  notification,
  checked,
  onToggleCheck,
  onToggleRead,
  onOpenReview,
  onOpenReply,
}: NotificationRowProps) {
  const typeKey = resolveNotificationType(notification.type);
  const meta = NOTIFICATION_TYPE_META[typeKey];
  const Icon = meta.icon;
  const metadata = (notification.metadata ?? {}) as Record<string, unknown>;
  const reportId = typeof metadata.reportId === 'string' ? metadata.reportId : undefined;
  const reporterId = typeof metadata.reporterId === 'string' ? metadata.reporterId : undefined;

  return (
    <li
      className={`group relative px-3 py-3 transition-colors ${
        !notification.read
          ? 'bg-primary/5 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary'
          : ''
      } ${checked ? 'bg-primary/10' : 'hover:bg-white/5'}`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleCheck}
          aria-label={`Select notification ${notification.title}`}
          className="mt-1 h-3.5 w-3.5 rounded accent-primary"
        />
        <div
          className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 ${meta.accent}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`min-w-0 truncate text-sm ${
                notification.read ? 'font-normal text-foreground/90' : 'font-semibold text-foreground'
              }`}
            >
              {notification.title}
            </h4>
            <div className="flex flex-shrink-0 items-center gap-1">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}
              >
                {meta.label}
              </span>
              <button
                type="button"
                onClick={onToggleRead}
                title={notification.read ? 'Mark unread' : 'Mark read'}
                aria-label={notification.read ? 'Mark unread' : 'Mark read'}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                {notification.read ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <p
            className={`mt-0.5 whitespace-pre-wrap text-xs ${
              notification.read ? 'text-muted-foreground' : 'text-foreground/80'
            }`}
          >
            {notification.message}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span
              className="inline-flex items-center gap-1 tabular-nums"
              title={notificationAbsoluteDate(notification.createdAt)}
            >
              {notificationRelativeAge(notification.createdAt)}
            </span>
            {notification.user?.name && (
              <span className="inline-flex items-center gap-1">
                <UserIcon className="h-3 w-3" aria-hidden />
                {notification.user.name}
              </span>
            )}

            {typeKey === 'user_report' && (
              <span className="ml-auto inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenReview(reportId)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-foreground transition hover:bg-white/10"
                  title="Review report"
                >
                  <Shield className="h-3 w-3" />
                  Review
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenReply(reporterId, notification.user?.name ?? undefined, notification.message)
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/15 px-2 py-0.5 text-[11px] text-primary transition hover:bg-primary/25"
                  title="Reply to reporter"
                >
                  <MessageSquare className="h-3 w-3" />
                  Reply
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/* --------------------------- States & overlays --------------------------- */

function ListSkeleton() {
  return (
    <ul className="divide-y divide-white/5">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="animate-pulse p-3">
          <div className="flex gap-2.5">
            <div className="h-3.5 w-3.5 rounded bg-white/10" />
            <div className="h-7 w-7 rounded-md bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-white/10" />
              <div className="h-2.5 w-1/2 rounded bg-white/5" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyListState({
  readFilter,
  typeFilter,
  q,
  onReset,
}: {
  readFilter: ReadFilter;
  typeFilter: TypeFilter;
  q: string;
  onReset: () => void;
}) {
  const hasFilter = readFilter !== 'all' || typeFilter !== 'all' || q.trim().length > 0;
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <Bell className="mb-3 h-10 w-10 text-white/20" />
      <p className="text-sm font-medium text-foreground">
        {hasFilter ? 'No notifications match these filters' : 'Inbox zero — no notifications'}
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {hasFilter
          ? 'Try broadening the filters, or clear them to see everything.'
          : 'Admin messages, bans, system events, and user reports will appear here.'}
      </p>
      {hasFilter && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-300">
        <X className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-foreground">Couldn&apos;t load notifications</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground hover:bg-white/10"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </button>
    </div>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const shortcuts: Array<{ keys: string[]; label: string }> = [
    { keys: ['/'], label: 'Focus search' },
    { keys: ['1'], label: 'Show all' },
    { keys: ['2'], label: 'Show unread' },
    { keys: ['3'], label: 'Show read' },
    { keys: ['?'], label: 'Toggle this dialog' },
    { keys: ['Esc'], label: 'Close dialog' },
  ];
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16181d] shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Keyboard shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="divide-y divide-white/5 px-2 py-1">
          {shortcuts.map((s) => (
            <li key={s.label} className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
