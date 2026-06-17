'use client';

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock,
  Copy,
  Keyboard,
  Loader2,
  Mail,
  MailX,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Reply,
  Search,
  Send,
  Sparkles,
  Tag,
  User,
  X,
} from 'lucide-react';

import AdminHeader from '@/components/admin/AdminHeader';
import BulkActionBar from '@/components/admin/BulkActionBar';
import { useAdminToast } from '@/components/admin/AdminToast';
import {
  contactAbsoluteDate,
  contactRelativeAge,
  contactSlaBucket,
  CONTACT_SLA_CHIP,
  CONTACT_SORT_LABELS,
  CONTACT_STATUS_META,
  CONTACT_STATUSES,
  type ContactSort,
  type ContactStatus,
} from '@/lib/contactAdmin';

interface ContactUser {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  image: string | null;
}

interface ContactReply {
  id: string;
  message: string;
  sentToEmail: boolean;
  createdAt: string;
  admin: { id: string; name: string | null; email: string | null; image: string | null };
}

interface ContactMessage {
  id: string;
  subject: string;
  message: string;
  topic: string;
  attachments: string[];
  status: ContactStatus;
  createdAt: string;
  user: ContactUser;
  replies: ContactReply[];
  _count?: { replies: number };
}

type StatusFilter = ContactStatus | 'all';

interface StatusCounts {
  all: number;
  new: number;
  'in-progress': number;
  resolved: number;
}

const REPLY_TEMPLATES: Array<{ label: string; body: string }> = [
  {
    label: 'Acknowledge',
    body: 'Thanks for getting in touch — we have received your message and a member of the team will follow up shortly. Appreciate your patience.',
  },
  {
    label: 'Need more info',
    body: 'Thanks for reaching out. Could you share a little more detail so we can help you effectively? Specifically, the steps you took and any screenshots or error messages would help us move faster.',
  },
  {
    label: 'Resolved',
    body: 'Glad to say this is now resolved on our end. Please let us know if you see any remaining issues and we will dig in again.',
  },
  {
    label: 'Forwarded',
    body: 'Thanks for writing in. We have forwarded this to the team best placed to help and will follow up here with an update soon.',
  },
  {
    label: 'Close with thanks',
    body: 'Thanks again for reaching out. Closing this out for now — feel free to reply here or open a new request any time.',
  },
];

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function ContactInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();

  const urlStatus = (searchParams.get('status') as StatusFilter) || 'all';
  const urlSort = (searchParams.get('sort') as ContactSort) || 'newest';
  const urlQ = searchParams.get('q') || '';
  const urlSelectedId = searchParams.get('id');

  const [status, setStatus] = useState<StatusFilter>(urlStatus);
  const [sort, setSort] = useState<ContactSort>(urlSort);
  const [searchText, setSearchText] = useState(urlQ);
  const debouncedSearch = useDebounced(searchText, 350);

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({
    all: 0,
    new: 0,
    'in-progress': 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(urlSelectedId);
  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [replyMessage, setReplyMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [quickMenuForId, setQuickMenuForId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (sort !== 'newest') params.set('sort', sort);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    return params;
  }, [status, sort, debouncedSearch]);

  const fetchMessages = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setRefreshing(true);
      setError(null);
      try {
        const params = buildQuery();
        params.set('limit', '200');
        const res = await fetch(`/api/admin/contact?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.counts) setCounts(data.counts);
      } catch (err) {
        console.error('Failed to fetch contact messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load contact messages');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQuery],
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const params = buildQuery();
    if (selectedId) params.set('id', selectedId);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [buildQuery, selectedId, router]);

  useEffect(() => {
    if (!selectedId && urlSelectedId && messages.some((m) => m.id === urlSelectedId)) {
      setSelectedId(urlSelectedId);
    }
  }, [messages, selectedId, urlSelectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setReplyMessage('');
    setReplyEmail(true);
  }, [selectedId]);

  useEffect(() => {
    if (!quickMenuForId) return;
    const onClick = () => setQuickMenuForId(null);
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [quickMenuForId]);

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const selectedInView = messages.filter((m) => selectedIds.has(m.id));

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allIn = messages.length > 0 && messages.every((m) => prev.has(m.id));
      const next = new Set(prev);
      if (allIn) messages.forEach((m) => next.delete(m.id));
      else messages.forEach((m) => next.add(m.id));
      return next;
    });
  };

  const bulkUpdateStatus = async (nextStatus: ContactStatus) => {
    if (selectedIds.size === 0) return;
    const shouldContinue =
      nextStatus === 'resolved'
        ? await toast.confirm({
            title: `Resolve ${selectedIds.size} message${selectedIds.size === 1 ? '' : 's'}?`,
            description: 'Marks them as resolved. You can reopen them later.',
            confirmLabel: 'Resolve',
          })
        : true;
    if (!shouldContinue) return;

    setBulkUpdating(true);
    try {
      const res = await fetch('/api/admin/contact/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: Array.from(selectedIds), status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Bulk update failed');
      }
      const body = await res.json();
      toast.push({
        tone: 'success',
        title: `${body.updated ?? selectedIds.size} updated`,
        description: `Status → ${CONTACT_STATUS_META[nextStatus].label}`,
      });
      clearSelection();
      fetchMessages({ silent: true });
    } catch (err) {
      toast.push({
        tone: 'error',
        title: 'Bulk update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBulkUpdating(false);
    }
  };

  const updateStatus = async (messageId: string, nextStatus: ContactStatus) => {
    const snapshot = messages;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: nextStatus } : m)));
    try {
      const res = await fetch('/api/admin/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, status: nextStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.push({
        tone: 'success',
        title: `Status → ${CONTACT_STATUS_META[nextStatus].label}`,
        duration: 2500,
      });
      fetchMessages({ silent: true });
    } catch (err) {
      setMessages(snapshot);
      toast.push({
        tone: 'error',
        title: 'Failed to update status',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyMessage.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch('/api/admin/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactMessageId: selectedMessage.id,
          message: replyMessage,
          sendEmail: replyEmail,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to send');
      }
      toast.push({
        tone: 'success',
        title: replyEmail ? 'Reply sent + emailed' : 'Internal note saved',
        description: replyEmail
          ? `To ${selectedMessage.user?.email ?? 'sender'}`
          : 'Not emailed to sender',
      });
      setReplyMessage('');
      fetchMessages({ silent: true });
    } catch (err) {
      toast.push({
        tone: 'error',
        title: 'Reply failed',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    } finally {
      setSendingReply(false);
    }
  };

  const goToNeighbor = useCallback(
    (direction: 1 | -1) => {
      if (messages.length === 0) return;
      if (!selectedId) {
        setSelectedId(messages[0].id);
        return;
      }
      const idx = messages.findIndex((m) => m.id === selectedId);
      const nextIdx = Math.max(0, Math.min(messages.length - 1, idx + direction));
      if (nextIdx !== idx) setSelectedId(messages[nextIdx].id);
    },
    [messages, selectedId],
  );

  const copyPermalink = async () => {
    if (typeof window === 'undefined' || !selectedMessage) return;
    const url = `${window.location.origin}${window.location.pathname}?id=${selectedMessage.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.push({ tone: 'success', title: 'Permalink copied', duration: 1800 });
    } catch {
      toast.push({ tone: 'error', title: 'Could not copy', description: 'Clipboard unavailable' });
    }
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
        if (quickMenuForId) {
          setQuickMenuForId(null);
          e.preventDefault();
          return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && target === replyInputRef.current) {
        e.preventDefault();
        handleReply();
        return;
      }

      if (inField) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToNeighbor(1);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToNeighbor(-1);
      } else if (e.key === 'r' && selectedMessage) {
        e.preventDefault();
        replyInputRef.current?.focus();
      } else if (e.key === 'e' && selectedMessage) {
        e.preventDefault();
        updateStatus(selectedMessage.id, 'resolved');
      } else if (e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const map: StatusFilter[] = ['all', 'new', 'in-progress', 'resolved'];
        setStatus(map[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goToNeighbor, selectedMessage, showShortcuts, quickMenuForId]);

  return (
    <div className="min-h-dvh">
      <AdminHeader
        title="Contact inbox"
        description="Support requests, partnerships and feedback submitted through the contact form."
        icon={Mail}
        iconTone="primary"
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <strong className="text-foreground">{counts.all.toLocaleString()}</strong> total
            </span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="tabular-nums">
              <strong className="text-red-300">{counts.new}</strong> new
            </span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="tabular-nums">
              <strong className="text-primary">{counts['in-progress']}</strong> in progress
            </span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="tabular-nums">
              <strong className="text-emerald-300">{counts.resolved}</strong> resolved
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
              onClick={() => fetchMessages()}
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

      <FilterBar
        status={status}
        setStatus={setStatus}
        sort={sort}
        setSort={setSort}
        searchText={searchText}
        setSearchText={setSearchText}
        counts={counts}
        searchInputRef={searchInputRef}
      />

      <BulkActionBar
        count={selectedIds.size}
        onClear={clearSelection}
        label={selectedIds.size === 1 ? 'message selected' : 'messages selected'}
        actions={[
          {
            label: 'Mark new',
            icon: CircleDashed,
            tone: 'neutral',
            onClick: () => bulkUpdateStatus('new'),
            disabled: bulkUpdating,
          },
          {
            label: 'In progress',
            icon: Loader2,
            tone: 'primary',
            onClick: () => bulkUpdateStatus('in-progress'),
            disabled: bulkUpdating,
          },
          {
            label: 'Resolve',
            icon: CheckCircle2,
            tone: 'success',
            onClick: () => bulkUpdateStatus('resolved'),
            disabled: bulkUpdating,
          },
        ]}
      />

      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(360px,420px)_1fr]">
        <section
          className={`flex min-h-0 flex-col rounded-xl border border-white/10 bg-[#16181d] ${
            mobileDetailOpen ? 'hidden lg:flex' : 'flex'
          }`}
          aria-label="Contact list"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5 text-xs text-muted-foreground">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={messages.length > 0 && messages.every((m) => selectedIds.has(m.id))}
                ref={(el) => {
                  if (!el) return;
                  const some = messages.some((m) => selectedIds.has(m.id));
                  const all = messages.length > 0 && messages.every((m) => selectedIds.has(m.id));
                  el.indeterminate = some && !all;
                }}
                onChange={toggleSelectAllVisible}
                className="h-3.5 w-3.5 rounded accent-primary"
                aria-label="Select all visible messages"
              />
              {selectedInView.length > 0
                ? `${selectedInView.length} of ${messages.length} selected`
                : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`}
            </label>
            <span className="tabular-nums">{CONTACT_SORT_LABELS[sort]}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <ListSkeleton />
            ) : error ? (
              <ErrorState message={error} onRetry={() => fetchMessages()} />
            ) : messages.length === 0 ? (
              <EmptyListState
                status={status}
                q={debouncedSearch}
                onReset={() => {
                  setStatus('all');
                  setSearchText('');
                }}
              />
            ) : (
              <ul className="divide-y divide-white/5">
                {messages.map((m) => (
                  <MessageRow
                    key={m.id}
                    message={m}
                    active={selectedId === m.id}
                    checked={selectedIds.has(m.id)}
                    onSelect={() => {
                      setSelectedId(m.id);
                      setMobileDetailOpen(true);
                    }}
                    onToggleCheck={() => toggleSelected(m.id)}
                    quickMenuOpen={quickMenuForId === m.id}
                    onToggleQuickMenu={(open) => setQuickMenuForId(open ? m.id : null)}
                    onQuickStatus={(s) => {
                      setQuickMenuForId(null);
                      updateStatus(m.id, s);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section
          className={`flex min-h-0 flex-col rounded-xl border border-white/10 bg-[#16181d] ${
            mobileDetailOpen || selectedMessage ? 'flex' : 'hidden lg:flex'
          }`}
          aria-label="Contact detail"
        >
          {selectedMessage ? (
            <MessageDetailPanel
              message={selectedMessage}
              onBackMobile={() => setMobileDetailOpen(false)}
              onStatusChange={(s) => updateStatus(selectedMessage.id, s)}
              onCopyPermalink={copyPermalink}
              replyMessage={replyMessage}
              setReplyMessage={setReplyMessage}
              replyEmail={replyEmail}
              setReplyEmail={setReplyEmail}
              onSendReply={handleReply}
              sendingReply={sendingReply}
              replyInputRef={replyInputRef}
            />
          ) : (
            <DetailEmptyState />
          )}
        </section>
      </div>

      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

/* ------------------------------- Filter bar ------------------------------- */

interface FilterBarProps {
  status: StatusFilter;
  setStatus: (s: StatusFilter) => void;
  sort: ContactSort;
  setSort: (s: ContactSort) => void;
  searchText: string;
  setSearchText: (s: string) => void;
  counts: StatusCounts;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

function FilterBar({
  status,
  setStatus,
  sort,
  setSort,
  searchText,
  setSearchText,
  counts,
  searchInputRef,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-10 mb-4 -mx-6 px-6 py-3 border-b border-white/10 bg-background/90 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-[#16181d] px-3 py-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search messages by subject, body, sender…   (press /)"
            aria-label="Search messages"
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
          <span className="hidden sm:inline">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ContactSort)}
            className="bg-transparent text-xs text-foreground focus:outline-none"
            aria-label="Sort messages"
          >
            <option value="newest" className="bg-[#16181d]">
              Newest first
            </option>
            <option value="oldest" className="bg-[#16181d]">
              Oldest first
            </option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          role="radiogroup"
          aria-label="Filter by status"
          className="flex flex-wrap items-center gap-1"
        >
          <StatusTab
            label="All"
            count={counts.all}
            active={status === 'all'}
            onClick={() => setStatus('all')}
          />
          {CONTACT_STATUSES.map((s) => {
            const meta = CONTACT_STATUS_META[s];
            return (
              <StatusTab
                key={s}
                label={meta.label}
                count={counts[s]}
                active={status === s}
                tone={s}
                onClick={() => setStatus(s)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusTab({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: ContactStatus;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? tone
            ? `${CONTACT_STATUS_META[tone].chip} border-current/40`
            : 'border-primary/40 bg-primary/15 text-primary'
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

/* -------------------------------- Row ------------------------------------ */

interface MessageRowProps {
  message: ContactMessage;
  active: boolean;
  checked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  quickMenuOpen: boolean;
  onToggleQuickMenu: (open: boolean) => void;
  onQuickStatus: (s: ContactStatus) => void;
}

function MessageRow({
  message,
  active,
  checked,
  onSelect,
  onToggleCheck,
  quickMenuOpen,
  onToggleQuickMenu,
  onQuickStatus,
}: MessageRowProps) {
  const meta = CONTACT_STATUS_META[message.status];
  const bucket = contactSlaBucket(message.status, message.createdAt);
  const replyCount = message._count?.replies ?? message.replies.length;
  const StatusIcon = meta.icon;
  const senderName =
    message.user?.name || message.user?.username || message.user?.email || 'Unknown';

  return (
    <li
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-selected={active}
      className={`group relative cursor-pointer px-3 py-3 transition-colors outline-none focus-visible:bg-white/5 ${
        active
          ? 'bg-primary/10 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary'
          : checked
          ? 'bg-primary/5 hover:bg-primary/10'
          : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleCheck}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select message ${message.subject}`}
          className="mt-1 h-3.5 w-3.5 rounded accent-primary"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="min-w-0 truncate text-sm font-medium text-foreground">
              {message.subject}
            </h4>
            <div className="flex flex-shrink-0 items-center gap-1">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}
              >
                <StatusIcon
                  className={`h-3 w-3 ${message.status === 'in-progress' ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">{meta.label}</span>
              </span>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Quick status menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleQuickMenu(!quickMenuOpen);
                  }}
                  className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-white/10 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                {quickMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-white/10 bg-[#1a1b23] py-1 shadow-xl"
                    role="menu"
                  >
                    {CONTACT_STATUSES.map((s) => {
                      const MIcon = CONTACT_STATUS_META[s].icon;
                      return (
                        <button
                          key={s}
                          type="button"
                          role="menuitem"
                          onClick={() => onQuickStatus(s)}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition ${
                            message.status === s
                              ? 'bg-primary/15 text-primary'
                              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                          }`}
                        >
                          <MIcon className="h-3.5 w-3.5" />
                          {CONTACT_STATUS_META[s].label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{message.message}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" aria-hidden />
              {senderName}
            </span>
            <span
              className={`inline-flex items-center gap-1 tabular-nums ${CONTACT_SLA_CHIP[bucket]}`}
              title={contactAbsoluteDate(message.createdAt)}
            >
              <Clock className="h-3 w-3" aria-hidden />
              {contactRelativeAge(message.createdAt)}
            </span>
            {replyCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Reply className="h-3 w-3" aria-hidden />
                {replyCount}
              </span>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1" title="Has attachments">
                <Paperclip className="h-3 w-3" aria-hidden />
                {message.attachments.length}
              </span>
            )}
            {message.topic && message.topic !== 'general' && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <Tag className="h-2.5 w-2.5" aria-hidden />
                {message.topic}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/* ----------------------------- Detail panel ------------------------------ */

interface MessageDetailPanelProps {
  message: ContactMessage;
  onBackMobile: () => void;
  onStatusChange: (s: ContactStatus) => void;
  onCopyPermalink: () => void;
  replyMessage: string;
  setReplyMessage: (s: string) => void;
  replyEmail: boolean;
  setReplyEmail: (b: boolean) => void;
  onSendReply: () => void;
  sendingReply: boolean;
  replyInputRef: React.RefObject<HTMLTextAreaElement>;
}

function MessageDetailPanel({
  message,
  onBackMobile,
  onStatusChange,
  onCopyPermalink,
  replyMessage,
  setReplyMessage,
  replyEmail,
  setReplyEmail,
  onSendReply,
  sendingReply,
  replyInputRef,
}: MessageDetailPanelProps) {
  const meta = CONTACT_STATUS_META[message.status];
  const bucket = contactSlaBucket(message.status, message.createdAt);
  const StatusIcon = meta.icon;
  const senderName =
    message.user?.name || message.user?.username || message.user?.email || 'Unknown';

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onBackMobile}
            className="-ml-1 rounded-md p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground lg:hidden"
            aria-label="Back to list"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.chip}`}
              >
                <StatusIcon
                  className={`h-3 w-3 ${message.status === 'in-progress' ? 'animate-spin' : ''}`}
                />
                {meta.label}
              </span>
              {message.topic && message.topic !== 'general' && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {message.topic}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] tabular-nums ${CONTACT_SLA_CHIP[bucket]}`}
                title={contactAbsoluteDate(message.createdAt)}
              >
                <Clock className="h-3 w-3" />
                {contactRelativeAge(message.createdAt)}
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-semibold text-foreground">{message.subject}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {senderName}
              </span>
              {message.user?.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {message.user.email}
                </span>
              )}
              <span title={contactAbsoluteDate(message.createdAt)}>
                Received {contactAbsoluteDate(message.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <InlineSelect
            label="Status"
            value={message.status}
            onChange={(v) => onStatusChange(v as ContactStatus)}
            options={CONTACT_STATUSES.map((s) => ({ value: s, label: CONTACT_STATUS_META[s].label }))}
          />
          <button
            type="button"
            onClick={onCopyPermalink}
            aria-label="Copy permalink to this message"
            title="Copy permalink"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-4">
          <Section title="Message">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {message.message}
            </p>
          </Section>

          {message.attachments && message.attachments.length > 0 && (
            <Section title={`Attachments (${message.attachments.length})`}>
              <ul className="flex flex-wrap gap-2">
                {message.attachments.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-primary hover:bg-white/10"
                    >
                      <Paperclip className="h-3 w-3" />
                      {decodeURIComponent(url.split('/').pop() || url).slice(0, 40)}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section
            title={`Replies (${message.replies.length})`}
            right={
              <span className="text-[11px] text-muted-foreground">
                Oldest first · internal notes not emailed to sender
              </span>
            }
          >
            {message.replies.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No replies yet.</p>
            ) : (
              <ol className="space-y-2.5">
                {message.replies.map((reply) => (
                  <li key={reply.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {reply.admin.name ?? reply.admin.email ?? 'Admin'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${
                          reply.sentToEmail
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-white/10 bg-white/5 text-muted-foreground'
                        }`}
                      >
                        {reply.sentToEmail ? (
                          <>
                            <Mail className="h-3 w-3" /> Emailed
                          </>
                        ) : (
                          <>
                            <MailX className="h-3 w-3" /> Internal
                          </>
                        )}
                      </span>
                      <span
                        className="ml-auto tabular-nums"
                        title={contactAbsoluteDate(reply.createdAt)}
                      >
                        {contactRelativeAge(reply.createdAt)} ago
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">{reply.message}</p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>

      <ReplyComposer
        replyMessage={replyMessage}
        setReplyMessage={setReplyMessage}
        replyEmail={replyEmail}
        setReplyEmail={setReplyEmail}
        onSend={onSendReply}
        sending={sendingReply}
        senderEmail={message.user?.email ?? null}
        replyInputRef={replyInputRef}
      />
    </>
  );
}

function InlineSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#1a1b23] pl-2 pr-1 py-1 text-xs text-muted-foreground">
      <span className="sr-only">{label}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent pr-1 text-xs text-foreground focus:outline-none"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#16181d]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

/* --------------------------- Reply composer ------------------------------ */

interface ReplyComposerProps {
  replyMessage: string;
  setReplyMessage: (s: string) => void;
  replyEmail: boolean;
  setReplyEmail: (b: boolean) => void;
  onSend: () => void;
  sending: boolean;
  senderEmail: string | null;
  replyInputRef: React.RefObject<HTMLTextAreaElement>;
}

function ReplyComposer({
  replyMessage,
  setReplyMessage,
  replyEmail,
  setReplyEmail,
  onSend,
  sending,
  senderEmail,
  replyInputRef,
}: ReplyComposerProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const disabled = !replyMessage.trim() || sending;

  const pickTemplate = (body: string) => {
    setReplyMessage(body);
    setShowTemplates(false);
    replyInputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) onSend();
    }
  };

  return (
    <div className="border-t border-white/10 bg-[#14161b] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplates((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            <Sparkles className="h-3 w-3" />
            Templates
            <ChevronDown className="h-3 w-3" />
          </button>
          {showTemplates && (
            <div className="absolute bottom-full left-0 z-30 mb-1 w-72 overflow-hidden rounded-lg border border-white/10 bg-[#1a1b23] py-1 shadow-xl">
              {REPLY_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => pickTemplate(t.body)}
                  className="block w-full truncate px-3 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                  title={t.body}
                >
                  <span className="font-medium text-foreground">{t.label}</span>
                  <span className="ml-2 opacity-70">{t.body.slice(0, 60)}…</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={replyEmail}
            onChange={(e) => setReplyEmail(e.target.checked)}
            className="h-3.5 w-3.5 rounded accent-primary"
          />
          {replyEmail ? (
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Mail className="h-3 w-3" /> Email{senderEmail ? ` to ${senderEmail}` : ' sender'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <MailX className="h-3 w-3" /> Internal note (not emailed)
            </span>
          )}
        </label>
      </div>

      <textarea
        ref={replyInputRef}
        value={replyMessage}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReplyMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder="Write a reply… (⌘↵ to send)"
        aria-label="Reply to contact message"
        className="w-full resize-none rounded-lg border border-white/10 bg-[#16181d] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {replyMessage.length} {replyMessage.length === 1 ? 'char' : 'chars'}
        </span>
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? 'Sending…' : replyEmail ? 'Send reply' : 'Save note'}
        </button>
      </div>
    </div>
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
  status,
  q,
  onReset,
}: {
  status: StatusFilter;
  q: string;
  onReset: () => void;
}) {
  const hasFilter = status !== 'all' || q.trim().length > 0;
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <MessageSquare className="mb-3 h-10 w-10 text-white/20" />
      <p className="text-sm font-medium text-foreground">
        {hasFilter ? 'No messages match these filters' : 'Inbox zero — no contact messages'}
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {hasFilter
          ? 'Try broadening the filters, or clear them to see everything.'
          : 'When someone writes through the contact form, it will show up here.'}
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
      <p className="text-sm font-medium text-foreground">Couldn&apos;t load messages</p>
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

function DetailEmptyState() {
  return (
    <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <MessageSquare className="mb-3 h-12 w-12 text-white/20" />
      <p className="text-sm font-medium text-foreground">Select a message to view details</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Use <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10px]">j</kbd> /
        <kbd className="ml-1 rounded bg-white/10 px-1 py-0.5 font-mono text-[10px]">k</kbd> to move
        through the list,{' '}
        <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10px]">/</kbd> to search,
        <kbd className="ml-1 rounded bg-white/10 px-1 py-0.5 font-mono text-[10px]">?</kbd> for all
        shortcuts.
      </p>
    </div>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const shortcuts: Array<{ keys: string[]; label: string }> = [
    { keys: ['/'], label: 'Focus search' },
    { keys: ['j', '↓'], label: 'Next message' },
    { keys: ['k', '↑'], label: 'Previous message' },
    { keys: ['r'], label: 'Focus reply composer' },
    { keys: ['e'], label: 'Mark current message resolved' },
    { keys: ['⌘', '↵'], label: 'Send reply from composer' },
    { keys: ['1'], label: 'Show all' },
    { keys: ['2'], label: 'Show new' },
    { keys: ['3'], label: 'Show in-progress' },
    { keys: ['4'], label: 'Show resolved' },
    { keys: ['?'], label: 'Toggle this dialog' },
    { keys: ['Esc'], label: 'Close dialog / menu' },
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
