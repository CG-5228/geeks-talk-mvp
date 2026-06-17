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
import Image from 'next/image';
import {
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  CircleSlash,
  Clock,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Keyboard,
  Loader2,
  Mail,
  MailX,
  RefreshCw,
  Reply,
  Search,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';

import AdminHeader from '@/components/admin/AdminHeader';
import BulkActionBar from '@/components/admin/BulkActionBar';
import { useAdminToast } from '@/components/admin/AdminToast';
import {
  absoluteDate,
  BUG_SEVERITIES,
  BUG_STATUSES,
  SEVERITY_META,
  SLA_CHIP,
  SORT_LABELS,
  STATUS_META,
  relativeAge,
  slaBucket,
  type BugSeverity,
  type BugSort,
  type BugStatus,
} from '@/lib/bugAdmin';

interface BugReport {
  id: string;
  title: string;
  description?: string | null;
  severity: BugSeverity;
  status: BugStatus;
  steps: string;
  expected: string;
  actual: string;
  environment?: string | null;
  pagePath: string;
  screenshotUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    username: string | null;
    image: string | null;
  };
  replies: Array<{
    id: string;
    message: string;
    sentToEmail: boolean;
    createdAt: string;
    admin: { id: string; name: string | null; email: string | null; image: string | null };
  }>;
  _count?: { replies: number };
}

type StatusFilter = BugStatus | 'all';
type SeverityFilter = BugSeverity | 'all';

interface StatusCounts {
  all: number;
  open: number;
  'in-progress': number;
  resolved: number;
  closed: number;
}

const REPLY_TEMPLATES: Array<{ label: string; body: string }> = [
  {
    label: 'Acknowledge',
    body: 'Thanks for the report — we have reproduced this on our side and a fix is being worked on. We will follow up here when the patch lands.',
  },
  {
    label: 'Need more info',
    body: 'Could you share a bit more detail so we can reproduce this reliably? Specifically: which browser/device you were on, and the exact steps leading up to the issue.',
  },
  {
    label: 'Fixed in next release',
    body: 'Good news — the fix for this is queued for the next release. We will reply again once it has been deployed.',
  },
  {
    label: 'Already resolved',
    body: 'This issue has been resolved in our latest deploy. Please refresh / reload and let us know if you are still seeing it.',
  },
  {
    label: 'Not a bug',
    body: 'After investigating, this behavior is working as intended — but thank you for flagging it. Closing this report; feel free to open a new one if anything else comes up.',
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

export default function BugInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();

  const urlStatus = (searchParams.get('status') as StatusFilter) || 'all';
  const urlSeverity = (searchParams.get('severity') as SeverityFilter) || 'all';
  const urlSort = (searchParams.get('sort') as BugSort) || 'newest';
  const urlQ = searchParams.get('q') || '';
  const urlSelectedId = searchParams.get('id');

  const [status, setStatus] = useState<StatusFilter>(urlStatus);
  const [severity, setSeverity] = useState<SeverityFilter>(urlSeverity);
  const [sort, setSort] = useState<BugSort>(urlSort);
  const [searchText, setSearchText] = useState(urlQ);
  const debouncedSearch = useDebounced(searchText, 350);

  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({
    all: 0,
    open: 0,
    'in-progress': 0,
    resolved: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(urlSelectedId);
  const selectedBug = useMemo(() => bugs.find((b) => b.id === selectedId) ?? null, [bugs, selectedId]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [replyMessage, setReplyMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [quickMenuForId, setQuickMenuForId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (severity !== 'all') params.set('severity', severity);
    if (sort !== 'newest') params.set('sort', sort);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    return params;
  }, [status, severity, sort, debouncedSearch]);

  const fetchBugs = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setRefreshing(true);
      setError(null);
      try {
        const params = buildQuery();
        params.set('limit', '200');
        const res = await fetch(`/api/admin/bugs?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        setBugs(data.bugs || []);
        if (data.counts) setCounts(data.counts);
      } catch (err) {
        console.error('Failed to fetch bug reports:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bug reports');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQuery],
  );

  useEffect(() => {
    fetchBugs();
  }, [fetchBugs]);

  // Sync filter/sort/search state into the URL (replace, not push — don't pollute history)
  useEffect(() => {
    const params = buildQuery();
    if (selectedId) params.set('id', selectedId);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [buildQuery, selectedId, router]);

  // Restore from URL after initial fetch if an id is present but no bug selected
  useEffect(() => {
    if (!selectedId && urlSelectedId && bugs.some((b) => b.id === urlSelectedId)) {
      setSelectedId(urlSelectedId);
    }
  }, [bugs, selectedId, urlSelectedId]);

  // Reset reply composer when switching bugs
  useEffect(() => {
    if (!selectedId) return;
    setReplyMessage('');
    setReplyEmail(true);
  }, [selectedId]);

  // Close quick-menu on outside click
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

  const selectedInView = bugs.filter((b) => selectedIds.has(b.id));

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allIn = bugs.every((b) => prev.has(b.id));
      const next = new Set(prev);
      if (allIn) bugs.forEach((b) => next.delete(b.id));
      else bugs.forEach((b) => next.add(b.id));
      return next;
    });
  };

  const bulkUpdateStatus = async (nextStatus: BugStatus) => {
    if (selectedIds.size === 0) return;
    const shouldContinue =
      nextStatus === 'closed'
        ? await toast.confirm({
            title: `Close ${selectedIds.size} bug${selectedIds.size === 1 ? '' : 's'}?`,
            description: 'This will mark them as closed. You can reopen them later from the Closed tab.',
            confirmLabel: 'Close bugs',
            tone: 'danger',
          })
        : true;
    if (!shouldContinue) return;

    setBulkUpdating(true);
    try {
      const res = await fetch('/api/admin/bugs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugIds: Array.from(selectedIds), status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Bulk update failed');
      }
      const body = await res.json();
      toast.push({
        tone: 'success',
        title: `${body.updated ?? selectedIds.size} bugs updated`,
        description: `Status → ${STATUS_META[nextStatus].label}`,
      });
      clearSelection();
      fetchBugs({ silent: true });
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

  const updateBugStatus = async (bugId: string, nextStatus: BugStatus) => {
    const snapshot = bugs;
    setBugs((prev) => prev.map((b) => (b.id === bugId ? { ...b, status: nextStatus } : b)));
    try {
      const res = await fetch('/api/admin/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugId, status: nextStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.push({
        tone: 'success',
        title: `Status → ${STATUS_META[nextStatus].label}`,
        duration: 2500,
      });
      fetchBugs({ silent: true });
    } catch (err) {
      setBugs(snapshot);
      toast.push({
        tone: 'error',
        title: 'Failed to update status',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    }
  };

  const updateBugSeverity = async (bugId: string, nextSeverity: BugSeverity) => {
    const snapshot = bugs;
    setBugs((prev) => prev.map((b) => (b.id === bugId ? { ...b, severity: nextSeverity } : b)));
    try {
      const res = await fetch('/api/admin/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugId, severity: nextSeverity }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.push({ tone: 'success', title: `Severity → ${SEVERITY_META[nextSeverity].label}`, duration: 2500 });
    } catch (err) {
      setBugs(snapshot);
      toast.push({
        tone: 'error',
        title: 'Failed to update severity',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    }
  };

  const handleReply = async () => {
    if (!selectedBug || !replyMessage.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch('/api/admin/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bugReportId: selectedBug.id,
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
        description: replyEmail ? `To ${selectedBug.user.email ?? 'reporter'}` : 'Not emailed to reporter',
      });
      setReplyMessage('');
      fetchBugs({ silent: true });
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
      if (bugs.length === 0) return;
      if (!selectedId) {
        setSelectedId(bugs[0].id);
        return;
      }
      const idx = bugs.findIndex((b) => b.id === selectedId);
      const nextIdx = Math.max(0, Math.min(bugs.length - 1, idx + direction));
      if (nextIdx !== idx) setSelectedId(bugs[nextIdx].id);
    },
    [bugs, selectedId],
  );

  const copyPermalink = async () => {
    if (typeof window === 'undefined' || !selectedBug) return;
    const url = `${window.location.origin}${window.location.pathname}?id=${selectedBug.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.push({ tone: 'success', title: 'Permalink copied', duration: 1800 });
    } catch {
      toast.push({ tone: 'error', title: 'Could not copy', description: 'Clipboard unavailable' });
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === 'Escape') {
        if (lightboxUrl) {
          setLightboxUrl(null);
          e.preventDefault();
          return;
        }
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

      // Cmd/Ctrl+Enter to submit reply even from the textarea
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && target === replyInputRef.current) {
        e.preventDefault();
        handleReply();
        return;
      }

      if (inField) return; // ignore the rest while typing

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
      } else if (e.key === 'r' && selectedBug) {
        e.preventDefault();
        replyInputRef.current?.focus();
      } else if (e.key === 'e' && selectedBug) {
        e.preventDefault();
        updateBugStatus(selectedBug.id, 'resolved');
      } else if (e.key >= '1' && e.key <= '5') {
        // 1=all, 2=open, 3=in-progress, 4=resolved, 5=closed
        e.preventDefault();
        const map: StatusFilter[] = ['all', 'open', 'in-progress', 'resolved', 'closed'];
        setStatus(map[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goToNeighbor, selectedBug, lightboxUrl, showShortcuts, quickMenuForId]);

  return (
    <div className="min-h-dvh">
      <AdminHeader
        title="Bug reports"
        description="Triage, reply and resolve issues reported by users."
        icon={Bug}
        iconTone="warning"
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <strong className="text-foreground">{counts.all.toLocaleString()}</strong> total
            </span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="tabular-nums">
              <strong className="text-red-300">{counts.open}</strong> open
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
              onClick={() => fetchBugs()}
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
        severity={severity}
        setSeverity={setSeverity}
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
        label={selectedIds.size === 1 ? 'bug selected' : 'bugs selected'}
        actions={[
          {
            label: 'Reopen',
            icon: CircleDashed,
            tone: 'neutral',
            onClick: () => bulkUpdateStatus('open'),
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
          {
            label: 'Close',
            icon: CircleSlash,
            tone: 'neutral',
            onClick: () => bulkUpdateStatus('closed'),
            disabled: bulkUpdating,
          },
        ]}
      />

      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(360px,420px)_1fr]">
        <section
          className={`flex min-h-0 flex-col rounded-xl border border-white/10 bg-[#16181d] ${
            mobileDetailOpen ? 'hidden lg:flex' : 'flex'
          }`}
          aria-label="Bug list"
          ref={listContainerRef}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5 text-xs text-muted-foreground">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bugs.length > 0 && bugs.every((b) => selectedIds.has(b.id))}
                ref={(el) => {
                  if (!el) return;
                  const some = bugs.some((b) => selectedIds.has(b.id));
                  const all = bugs.length > 0 && bugs.every((b) => selectedIds.has(b.id));
                  el.indeterminate = some && !all;
                }}
                onChange={toggleSelectAllVisible}
                className="h-3.5 w-3.5 rounded accent-primary"
                aria-label="Select all visible bugs"
              />
              {selectedInView.length > 0
                ? `${selectedInView.length} of ${bugs.length} selected`
                : `${bugs.length} ${bugs.length === 1 ? 'report' : 'reports'}`}
            </label>
            <span className="tabular-nums">{SORT_LABELS[sort]}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <ListSkeleton />
            ) : error ? (
              <ErrorState message={error} onRetry={() => fetchBugs()} />
            ) : bugs.length === 0 ? (
              <EmptyListState
                status={status}
                severity={severity}
                q={debouncedSearch}
                onReset={() => {
                  setStatus('all');
                  setSeverity('all');
                  setSearchText('');
                }}
              />
            ) : (
              <ul className="divide-y divide-white/5">
                {bugs.map((bug) => (
                  <BugRow
                    key={bug.id}
                    bug={bug}
                    active={selectedId === bug.id}
                    checked={selectedIds.has(bug.id)}
                    onSelect={() => {
                      setSelectedId(bug.id);
                      setMobileDetailOpen(true);
                    }}
                    onToggleCheck={() => toggleSelected(bug.id)}
                    quickMenuOpen={quickMenuForId === bug.id}
                    onToggleQuickMenu={(open) => setQuickMenuForId(open ? bug.id : null)}
                    onQuickStatus={(s) => {
                      setQuickMenuForId(null);
                      updateBugStatus(bug.id, s);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section
          className={`flex min-h-0 flex-col rounded-xl border border-white/10 bg-[#16181d] ${
            mobileDetailOpen || selectedBug ? 'flex' : 'hidden lg:flex'
          }`}
          aria-label="Bug detail"
        >
          {selectedBug ? (
            <BugDetailPanel
              bug={selectedBug}
              onBackMobile={() => setMobileDetailOpen(false)}
              onStatusChange={(s) => updateBugStatus(selectedBug.id, s)}
              onSeverityChange={(s) => updateBugSeverity(selectedBug.id, s)}
              onOpenLightbox={(url) => setLightboxUrl(url)}
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

      {lightboxUrl && <ScreenshotLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

/* ------------------------------- Filter bar ------------------------------- */

interface FilterBarProps {
  status: StatusFilter;
  setStatus: (s: StatusFilter) => void;
  severity: SeverityFilter;
  setSeverity: (s: SeverityFilter) => void;
  sort: BugSort;
  setSort: (s: BugSort) => void;
  searchText: string;
  setSearchText: (s: string) => void;
  counts: StatusCounts;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

function FilterBar({
  status,
  setStatus,
  severity,
  setSeverity,
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
            placeholder="Search bugs by title, description, steps, URL…   (press /)"
            aria-label="Search bugs"
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
            onChange={(e) => setSort(e.target.value as BugSort)}
            className="bg-transparent text-xs text-foreground focus:outline-none"
            aria-label="Sort bugs"
          >
            <option value="newest" className="bg-[#16181d]">
              Newest first
            </option>
            <option value="oldest" className="bg-[#16181d]">
              Oldest first
            </option>
            <option value="severity" className="bg-[#16181d]">
              Severity
            </option>
            <option value="updated" className="bg-[#16181d]">
              Recently updated
            </option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="radiogroup" aria-label="Filter by status" className="flex flex-wrap items-center gap-1">
          <StatusTab label="All" count={counts.all} active={status === 'all'} onClick={() => setStatus('all')} />
          {BUG_STATUSES.map((s) => {
            const meta = STATUS_META[s];
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
        <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden />
        <div role="radiogroup" aria-label="Filter by severity" className="flex flex-wrap items-center gap-1">
          <SeverityPill label="Any severity" active={severity === 'all'} onClick={() => setSeverity('all')} />
          {BUG_SEVERITIES.map((s) => (
            <SeverityPill
              key={s}
              label={SEVERITY_META[s].label}
              active={severity === s}
              sevKey={s}
              onClick={() => setSeverity(s)}
            />
          ))}
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
  tone?: BugStatus;
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
            ? `${STATUS_META[tone].chip} border-current/40`
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

function SeverityPill({
  label,
  active,
  sevKey,
  onClick,
}: {
  label: string;
  active: boolean;
  sevKey?: BugSeverity;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? sevKey
            ? SEVERITY_META[sevKey].chip
            : 'border-primary/40 bg-primary/15 text-primary'
          : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
      }`}
    >
      {sevKey && <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_META[sevKey].dot}`} aria-hidden />}
      {label}
    </button>
  );
}

/* --------------------------------- Bug row -------------------------------- */

interface BugRowProps {
  bug: BugReport;
  active: boolean;
  checked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  quickMenuOpen: boolean;
  onToggleQuickMenu: (open: boolean) => void;
  onQuickStatus: (s: BugStatus) => void;
}

function BugRow({
  bug,
  active,
  checked,
  onSelect,
  onToggleCheck,
  quickMenuOpen,
  onToggleQuickMenu,
  onQuickStatus,
}: BugRowProps) {
  const sev = SEVERITY_META[bug.severity];
  const st = STATUS_META[bug.status];
  const bucket = slaBucket(bug.status, bug.createdAt);
  const replyCount = bug._count?.replies ?? bug.replies.length;
  const StatusIcon = st.icon;

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
        <div className="flex flex-col items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleCheck}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select bug ${bug.title}`}
            className="h-3.5 w-3.5 rounded accent-primary"
          />
          <span
            className={`h-2 w-2 rounded-full ${sev.dot}`}
            title={`${sev.label} severity`}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="min-w-0 truncate text-sm font-medium text-foreground">{bug.title}</h4>
            <div className="flex flex-shrink-0 items-center gap-1">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${st.chip}`}
              >
                <StatusIcon className={`h-3 w-3 ${bug.status === 'in-progress' ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{st.label}</span>
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
                    {BUG_STATUSES.map((s) => {
                      const MIcon = STATUS_META[s].icon;
                      return (
                        <button
                          key={s}
                          type="button"
                          role="menuitem"
                          onClick={() => onQuickStatus(s)}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition ${
                            bug.status === s
                              ? 'bg-primary/15 text-primary'
                              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                          }`}
                        >
                          <MIcon className="h-3.5 w-3.5" />
                          {STATUS_META[s].label}
                          {bug.status === s && <Check className="ml-auto h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {bug.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{bug.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" aria-hidden />
              {bug.user?.name || bug.user?.username || 'Unknown'}
            </span>
            <span className={`inline-flex items-center gap-1 tabular-nums ${SLA_CHIP[bucket]}`}>
              <Clock className="h-3 w-3" aria-hidden />
              {relativeAge(bug.createdAt)}
            </span>
            {replyCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Reply className="h-3 w-3" aria-hidden />
                {replyCount}
              </span>
            )}
            {bug.screenshotUrl && (
              <span className="inline-flex items-center gap-1" title="Has screenshot">
                <ImageIcon className="h-3 w-3" aria-hidden />
              </span>
            )}
            <span className="ml-auto truncate font-mono text-[10px] opacity-60">{bug.pagePath}</span>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ---------------------------- Detail panel -------------------------------- */

interface BugDetailPanelProps {
  bug: BugReport;
  onBackMobile: () => void;
  onStatusChange: (s: BugStatus) => void;
  onSeverityChange: (s: BugSeverity) => void;
  onOpenLightbox: (url: string) => void;
  onCopyPermalink: () => void;
  replyMessage: string;
  setReplyMessage: (s: string) => void;
  replyEmail: boolean;
  setReplyEmail: (b: boolean) => void;
  onSendReply: () => void;
  sendingReply: boolean;
  replyInputRef: React.RefObject<HTMLTextAreaElement>;
}

function BugDetailPanel({
  bug,
  onBackMobile,
  onStatusChange,
  onSeverityChange,
  onOpenLightbox,
  onCopyPermalink,
  replyMessage,
  setReplyMessage,
  replyEmail,
  setReplyEmail,
  onSendReply,
  sendingReply,
  replyInputRef,
}: BugDetailPanelProps) {
  const sev = SEVERITY_META[bug.severity];
  const st = STATUS_META[bug.status];
  const bucket = slaBucket(bug.status, bug.createdAt);
  const StatusIcon = st.icon;
  const SeverityIcon = sev.icon;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onBackMobile}
            className="lg:hidden -ml-1 rounded-md p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="Back to list"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${sev.chip}`}
              >
                <SeverityIcon className="h-3 w-3" />
                {sev.label}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${st.chip}`}
              >
                <StatusIcon className={`h-3 w-3 ${bug.status === 'in-progress' ? 'animate-spin' : ''}`} />
                {st.label}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] tabular-nums ${SLA_CHIP[bucket]}`}
                title={absoluteDate(bug.createdAt)}
              >
                <Clock className="h-3 w-3" />
                {relativeAge(bug.createdAt)}
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-semibold text-foreground">{bug.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {bug.user?.name || bug.user?.username || 'Unknown'}
              </span>
              {bug.user?.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {bug.user.email}
                </span>
              )}
              <span title={absoluteDate(bug.createdAt)}>Reported {absoluteDate(bug.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <InlineSelect
            label="Status"
            value={bug.status}
            onChange={(v) => onStatusChange(v as BugStatus)}
            options={BUG_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
          />
          <InlineSelect
            label="Severity"
            value={bug.severity}
            onChange={(v) => onSeverityChange(v as BugSeverity)}
            options={BUG_SEVERITIES.map((s) => ({ value: s, label: SEVERITY_META[s].label }))}
          />
          <button
            type="button"
            onClick={onCopyPermalink}
            aria-label="Copy permalink to this bug"
            title="Copy permalink"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-4">
          {bug.description && (
            <Section title="Description">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {bug.description}
              </p>
            </Section>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ReproBlock title="Steps to reproduce" body={bug.steps} />
            <ReproBlock title="Expected" body={bug.expected} tone="success" />
            <ReproBlock title="Actual" body={bug.actual} tone="error" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Section title="Page URL">
              <a
                href={bug.pagePath}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 break-all font-mono text-xs text-primary hover:underline"
              >
                {bug.pagePath}
                <ExternalLink className="h-3 w-3 opacity-60 transition group-hover:opacity-100" />
              </a>
            </Section>
            {bug.environment && (
              <Section title="Environment">
                <pre className="whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
                  {bug.environment}
                </pre>
              </Section>
            )}
          </div>

          {bug.screenshotUrl && (
            <Section title="Screenshot">
              <button
                type="button"
                onClick={() => onOpenLightbox(bug.screenshotUrl!)}
                className="group relative block overflow-hidden rounded-lg border border-white/10 bg-black/30 transition hover:border-primary/40"
                aria-label="Open screenshot in lightbox"
              >
                <Image
                  src={bug.screenshotUrl}
                  alt="Bug screenshot"
                  width={1200}
                  height={800}
                  unoptimized
                  className="h-auto max-h-96 w-full object-contain"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                  <span className="rounded-md bg-black/70 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                    Click to zoom
                  </span>
                </span>
              </button>
            </Section>
          )}

          <Section
            title={`Replies (${bug.replies.length})`}
            right={
              <span className="text-[11px] text-muted-foreground">
                Oldest first · internal notes not emailed to reporter
              </span>
            }
          >
            {bug.replies.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No replies yet.</p>
            ) : (
              <ol className="space-y-2.5">
                {bug.replies.map((reply) => (
                  <li
                    key={reply.id}
                    className="rounded-lg border border-white/10 bg-white/5 p-3"
                  >
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
                      <span className="ml-auto tabular-nums" title={absoluteDate(reply.createdAt)}>
                        {relativeAge(reply.createdAt)} ago
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
        reporterEmail={bug.user?.email ?? null}
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
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function ReproBlock({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone?: 'success' | 'error';
}) {
  const toneCls =
    tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/5'
      : tone === 'error'
      ? 'border-red-500/20 bg-red-500/5'
      : 'border-white/10 bg-white/5';
  return (
    <div className={`rounded-lg border p-3 ${toneCls}`}>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">{body || '—'}</p>
    </div>
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
  reporterEmail: string | null;
  replyInputRef: React.RefObject<HTMLTextAreaElement>;
}

function ReplyComposer({
  replyMessage,
  setReplyMessage,
  replyEmail,
  setReplyEmail,
  onSend,
  sending,
  reporterEmail,
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
              <Mail className="h-3 w-3" /> Email{reporterEmail ? ` to ${reporterEmail}` : ' reporter'}
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
        aria-label="Reply to bug report"
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

/* --------------------------- States & overlays ---------------------------- */

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
  severity,
  q,
  onReset,
}: {
  status: StatusFilter;
  severity: SeverityFilter;
  q: string;
  onReset: () => void;
}) {
  const hasFilter = status !== 'all' || severity !== 'all' || q.trim().length > 0;
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <Bug className="mb-3 h-10 w-10 text-white/20" />
      <p className="text-sm font-medium text-foreground">
        {hasFilter ? 'No bugs match these filters' : 'Inbox zero — no bug reports'}
      </p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {hasFilter
          ? 'Try broadening the filters, or clear them to see everything.'
          : 'When users report an issue, it will show up here.'}
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
      <p className="text-sm font-medium text-foreground">Couldn&apos;t load bug reports</p>
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
      <Bug className="mb-3 h-12 w-12 text-white/20" />
      <p className="text-sm font-medium text-foreground">Select a bug to view details</p>
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

function ScreenshotLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot"
      onClick={onClose}
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close screenshot"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="relative max-h-full max-w-5xl">
        <Image
          src={url}
          alt="Bug screenshot (zoomed)"
          width={1920}
          height={1200}
          unoptimized
          className="max-h-[90vh] w-auto rounded-lg object-contain"
        />
      </div>
    </div>,
    document.body,
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const shortcuts: Array<{ keys: string[]; label: string }> = [
    { keys: ['/'], label: 'Focus search' },
    { keys: ['j', '↓'], label: 'Next bug' },
    { keys: ['k', '↑'], label: 'Previous bug' },
    { keys: ['r'], label: 'Focus reply composer' },
    { keys: ['e'], label: 'Mark current bug resolved' },
    { keys: ['⌘', '↵'], label: 'Send reply from composer' },
    { keys: ['1'], label: 'Show all' },
    { keys: ['2'], label: 'Show open' },
    { keys: ['3'], label: 'Show in-progress' },
    { keys: ['4'], label: 'Show resolved' },
    { keys: ['5'], label: 'Show closed' },
    { keys: ['?'], label: 'Toggle this dialog' },
    { keys: ['Esc'], label: 'Close dialog / lightbox / menu' },
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
