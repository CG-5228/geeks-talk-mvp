'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  ScrollText,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Ban,
  CheckCircle,
  XCircle,
  Megaphone,
  UserCog,
  FileText,
  Settings,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import ExportButton from '@/components/admin/ExportButton';

interface AuditEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: { id: string; name: string | null; email: string | null; image: string | null };
}

const ACTION_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  'user.ban': { label: 'User banned', icon: Ban, tone: 'text-error bg-error/10' },
  'user.unban': { label: 'User unbanned', icon: CheckCircle, tone: 'text-success bg-success/10' },
  'report.resolve': { label: 'Report resolved', icon: CheckCircle, tone: 'text-success bg-success/10' },
  'report.reject': { label: 'Report rejected', icon: XCircle, tone: 'text-muted-foreground bg-white/5' },
  'report.bulk_update': { label: 'Reports bulk update', icon: ShieldAlert, tone: 'text-warning bg-warning/10' },
  'notification.send': { label: 'Broadcast sent', icon: Megaphone, tone: 'text-warning bg-warning/10' },
  'flag.create': { label: 'Flag created', icon: Settings, tone: 'text-info bg-info/10' },
  'flag.update': { label: 'Flag updated', icon: Settings, tone: 'text-info bg-info/10' },
  'flag.toggle': { label: 'Flag toggled', icon: Settings, tone: 'text-warning bg-warning/10' },
  'flag.delete': { label: 'Flag deleted', icon: Settings, tone: 'text-error bg-error/10' },
  'banner.save': { label: 'Banner saved', icon: Megaphone, tone: 'text-info bg-info/10' },
  'banner.toggle': { label: 'Banner toggled', icon: Megaphone, tone: 'text-info bg-info/10' },
  'banner.delete': { label: 'Banner deleted', icon: Megaphone, tone: 'text-error bg-error/10' },
  'admin.grant': { label: 'Admin granted', icon: UserCog, tone: 'text-accent bg-accent/10' },
  'admin.revoke': { label: 'Admin revoked', icon: UserCog, tone: 'text-error bg-error/10' },
  'blog.delete': { label: 'Blog deleted', icon: FileText, tone: 'text-error bg-error/10' },
};

function metaFor(action: string) {
  return ACTION_META[action] ?? { label: action, icon: Settings, tone: 'text-muted-foreground bg-white/5' };
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPage = async (cursor?: string | null) => {
    const params = new URLSearchParams({ limit: '50' });
    if (cursor) params.set('cursor', cursor);
    if (actionFilter !== 'all') params.set('action', actionFilter);
    if (adminFilter !== 'all') params.set('adminId', adminFilter);
    if (targetTypeFilter !== 'all') params.set('targetType', targetTypeFilter);
    if (fromDate) params.set('since', new Date(fromDate).toISOString());
    if (toDate) {
      // Interpret `toDate` (YYYY-MM-DD) as the end of that day, inclusive.
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      params.set('until', end.toISOString());
    }
    const res = await fetch(`/api/admin/audit-log?${params}`);
    if (!res.ok) throw new Error('Fetch failed');
    return (await res.json()) as { items: AuditEntry[]; nextCursor: string | null };
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await fetchPage(null);
      setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [actionFilter, adminFilter, targetTypeFilter, fromDate, toDate]);

  const resetFilters = () => {
    setActionFilter('all');
    setAdminFilter('all');
    setTargetTypeFilter('all');
    setFromDate('');
    setToDate('');
    setQuery('');
  };

  const hasActiveFilters =
    actionFilter !== 'all' ||
    adminFilter !== 'all' ||
    targetTypeFilter !== 'all' ||
    !!fromDate ||
    !!toDate ||
    query.trim().length > 0;

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(nextCursor);
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const actionOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.action));
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const adminOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const i of items) {
      const id = i.admin?.id;
      if (!id) continue;
      if (!map.has(id)) {
        map.set(id, { id, label: i.admin?.name || i.admin?.email || id.slice(0, 8) });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const targetTypeOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.targetType).filter((t): t is string => !!t));
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.action.toLowerCase().includes(q) ||
        (i.summary ?? '').toLowerCase().includes(q) ||
        (i.admin?.name ?? '').toLowerCase().includes(q) ||
        (i.admin?.email ?? '').toLowerCase().includes(q) ||
        (i.targetId ?? '').toLowerCase().includes(q),
    );
  }, [items, query]);

  const exportRows = useMemo(
    () =>
      filtered.map((i) => ({
        timestamp: i.createdAt,
        admin: i.admin?.name || i.admin?.email || i.admin?.id,
        action: i.action,
        target_type: i.targetType ?? '',
        target_id: i.targetId ?? '',
        summary: i.summary ?? '',
        ip: i.ip ?? '',
      })),
    [filtered],
  );

  return (
    <div className="p-6">
      <AdminHeader
        title="Audit log"
        description="Every admin action — who did what, when, and to whom."
        icon={ScrollText}
        iconTone="warning"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton filename="admin-audit-log" rows={exportRows} disabled={exportRows.length === 0} />
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-foreground border border-white/10 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search admin, target, summary…"
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          aria-label="Filter by action"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground outline-none focus:border-primary/40 transition-all"
        >
          {actionOptions.map((a) => (
            <option key={a} value={a} className="bg-background">
              {a === 'all' ? 'All actions' : metaFor(a).label}
            </option>
          ))}
        </select>
        <select
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
          aria-label="Filter by admin"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground outline-none focus:border-primary/40 transition-all"
        >
          <option value="all" className="bg-background">All admins</option>
          {adminOptions.map((a) => (
            <option key={a.id} value={a.id} className="bg-background">
              {a.label}
            </option>
          ))}
        </select>
        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          aria-label="Filter by target type"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground outline-none focus:border-primary/40 transition-all"
        >
          {targetTypeOptions.map((t) => (
            <option key={t} value={t} className="bg-background">
              {t === 'all' ? 'All targets' : t}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label="From date"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground outline-none focus:border-primary/40 transition-all"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label="To date"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground outline-none focus:border-primary/40 transition-all"
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3" />
            Loading audit log…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No audit entries</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((entry) => {
              const m = metaFor(entry.action);
              const Icon = m.icon;
              const isExpanded = expanded === entry.id;
              const hasDetails = !!entry.metadata || !!entry.userAgent || !!entry.ip;
              return (
                <li key={entry.id}>
                  <button
                    onClick={() => hasDetails && setExpanded(isExpanded ? null : entry.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div className={`p-1.5 rounded-md ${m.tone} flex-shrink-0 mt-0.5`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium text-foreground">{m.label}</span>
                        <span className="text-xs text-muted-foreground">by</span>
                        <span className="text-sm text-foreground">
                          {entry.admin?.name || entry.admin?.email || (entry.admin?.id ?? '').slice(0, 8)}
                        </span>
                        {entry.targetId && (
                          <>
                            <span className="text-xs text-muted-foreground">on</span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {entry.targetType ? `${entry.targetType}:` : ''}
                              {entry.targetId.slice(0, 12)}
                            </span>
                          </>
                        )}
                      </div>
                      {entry.summary && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.summary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <time className="text-xs text-muted-foreground tabular-nums">
                        {new Date(entry.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      {hasDetails &&
                        (isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ))}
                    </div>
                  </button>

                  {isExpanded && hasDetails && (
                    <div className="px-4 pb-4 -mt-1">
                      <div className="ml-11 rounded-lg bg-white/[0.03] border border-white/10 p-3 space-y-2 text-xs">
                        {entry.ip && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-20 flex-shrink-0">IP</span>
                            <span className="text-foreground font-mono">{entry.ip}</span>
                          </div>
                        )}
                        {entry.userAgent && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-20 flex-shrink-0">User agent</span>
                            <span className="text-foreground break-all">{entry.userAgent}</span>
                          </div>
                        )}
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <div>
                            <div className="text-muted-foreground mb-1">Metadata</div>
                            <pre className="text-foreground bg-background/50 border border-white/5 rounded p-2 overflow-x-auto">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-foreground border border-white/10 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
