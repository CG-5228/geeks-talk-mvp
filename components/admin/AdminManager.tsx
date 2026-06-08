'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Crown,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsCard from '@/components/admin/StatsCard';
import { useAdminToast } from '@/components/admin/AdminToast';

type AdminRole = 'super-admin' | 'moderator';
type RoleFilter = 'all' | AdminRole;
type SortField = 'name' | 'role' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface AdminPermission {
  id: string;
  adminHash: string;
  role: AdminRole;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    username?: string | null;
    image?: string | null;
  };
  grantedByUser?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface AuditEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  createdAt: string;
  admin: { id: string; name: string | null; email: string | null } | null;
}

interface UserSuggestion {
  id: string;
  email: string;
  name: string | null;
}

const PAGE_SIZE = 20;
const AUDIT_LIMIT = 20;
const ADMIN_AUDIT_ACTIONS: ReadonlyArray<string> = [
  'admin.grant',
  'admin.update',
  'admin.revoke',
];

const ROLE_LABEL: Record<AdminRole, string> = {
  'super-admin': 'Super admin',
  moderator: 'Moderator',
};

const ROLE_BLURB: Record<AdminRole, string> = {
  'super-admin': 'Full control — config, flags, database, broadcast, admin grants',
  moderator: 'Moderation only — reports, users, contact, bug inbox',
};

export default function AdminManager({ className = '' }: { className?: string }) {
  const toast = useAdminToast();

  const [admins, setAdmins] = useState<AdminPermission[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const [addOpen, setAddOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<AdminPermission | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const [permsRes, auditRes] = await Promise.all([
          fetch('/api/admin/permissions', { cache: 'no-store' }),
          fetch(`/api/admin/audit-log?limit=${AUDIT_LIMIT * 3}`, { cache: 'no-store' }),
        ]);
        if (!permsRes.ok) {
          const msg = await permsRes.json().catch(() => ({}));
          throw new Error(msg.error || `Failed to load admins (${permsRes.status})`);
        }
        const permsData = await permsRes.json();
        setAdmins(Array.isArray(permsData) ? permsData : []);

        if (auditRes.ok) {
          const auditData = await auditRes.json();
          const items: AuditEntry[] = Array.isArray(auditData?.items) ? auditData.items : [];
          setAudit(items.filter((e) => ADMIN_AUDIT_ACTIONS.includes(e.action)));
        } else {
          setAudit([]);
        }
        setError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load admins';
        setError(msg);
        if (silent) {
          toast.push({ tone: 'error', title: 'Refresh failed', description: msg });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const isTyping =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (el instanceof HTMLElement && el.isContentEditable);

      if (e.key === '/' && !isTyping && !addOpen && !roleTarget) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (
        (e.key === 'n' || e.key === 'N') &&
        !isTyping &&
        !addOpen &&
        !roleTarget &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setAddOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        if (!addOpen && !roleTarget && selected.size > 0) {
          setSelected(new Set());
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addOpen, roleTarget, selected.size]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return admins.filter((a) => {
      if (roleFilter !== 'all' && a.role !== roleFilter) return false;
      if (!q) return true;
      const haystacks = [a.user.name, a.user.email, a.user.username, a.grantedByUser?.email]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
      return haystacks.some((h) => h.includes(q));
    });
  }, [admins, query, roleFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      if (sortField === 'name') {
        const av = (a.user.name || a.user.email || '').toLowerCase();
        const bv = (b.user.name || b.user.email || '').toLowerCase();
        return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
      }
      if (sortField === 'role') {
        const order: Record<AdminRole, number> = { 'super-admin': 0, moderator: 1 };
        return (order[a.role] - order[b.role]) * dir;
      }
      // createdAt
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
    return copy;
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageAdmins = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page],
  );

  const stats = useMemo(() => {
    const total = admins.length;
    const supers = admins.filter((a) => a.role === 'super-admin').length;
    const mods = total - supers;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = audit.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length;
    return { total, supers, mods, recent };
  }, [admins, audit]);

  const allOnPageSelected = pageAdmins.length > 0 && pageAdmins.every((a) => selected.has(a.id));
  const someOnPageSelected = !allOnPageSelected && pageAdmins.some((a) => selected.has(a.id));

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageAdmins.forEach((a) => next.delete(a.id));
      } else {
        pageAdmins.forEach((a) => next.add(a.id));
      }
      return next;
    });
  };

  const handleAdd = async (email: string, role: AdminRole) => {
    const res = await fetch('/api/admin/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed (${res.status})`);
    }
    toast.push({
      tone: 'success',
      title: 'Admin added',
      description: `${email} granted ${ROLE_LABEL[role]} access`,
    });
    await fetchAll(true);
  };

  const handleRoleChange = async (admin: AdminPermission, nextRole: AdminRole) => {
    if (admin.role === nextRole) return;
    const res = await fetch('/api/admin/permissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: admin.user.id, role: nextRole }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed (${res.status})`);
    }
    toast.push({
      tone: 'success',
      title: 'Role updated',
      description: `${admin.user.email ?? admin.user.name ?? 'User'} is now ${ROLE_LABEL[nextRole]}`,
    });
    await fetchAll(true);
  };

  const handleRemove = async (admin: AdminPermission) => {
    const ok = await toast.confirm({
      title: 'Revoke admin access?',
      description: `${admin.user.email ?? admin.user.name ?? 'This user'} will immediately lose ${ROLE_LABEL[admin.role]} access. This cannot be undone from here — you would need to re-add them.`,
      confirmLabel: 'Revoke access',
      cancelLabel: 'Keep admin',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: admin.user.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      toast.push({
        tone: 'success',
        title: 'Admin revoked',
        description: admin.user.email ?? admin.user.name ?? undefined,
      });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(admin.id);
        return next;
      });
      await fetchAll(true);
    } catch (e) {
      toast.push({
        tone: 'error',
        title: 'Could not revoke',
        description: e instanceof Error ? e.message : 'Unexpected error',
      });
    }
  };

  const handleBulkRemove = async () => {
    const targets = admins.filter((a) => selected.has(a.id));
    if (targets.length === 0) return;
    const ok = await toast.confirm({
      title: `Revoke ${targets.length} admin${targets.length === 1 ? '' : 's'}?`,
      description: `${targets.length} user${targets.length === 1 ? '' : 's'} will immediately lose admin access. The env-configured super admin, if selected, is protected and will be skipped.`,
      confirmLabel: 'Revoke selected',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;

    setBulkBusy(true);
    let success = 0;
    const failures: string[] = [];
    for (const t of targets) {
      try {
        const res = await fetch('/api/admin/permissions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: t.user.id }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          failures.push(`${t.user.email ?? t.user.id}: ${err.error || res.status}`);
        } else {
          success += 1;
        }
      } catch (e) {
        failures.push(`${t.user.email ?? t.user.id}: ${e instanceof Error ? e.message : 'network'}`);
      }
    }
    setBulkBusy(false);
    setSelected(new Set());

    if (success > 0) {
      toast.push({
        tone: failures.length > 0 ? 'warning' : 'success',
        title: `Revoked ${success} admin${success === 1 ? '' : 's'}`,
        description: failures.length > 0 ? `${failures.length} failed — see list below` : undefined,
      });
    }
    if (failures.length > 0) {
      toast.push({
        tone: 'error',
        title: 'Some revokes failed',
        description: failures.slice(0, 3).join(' · '),
        duration: 8000,
      });
    }
    await fetchAll(true);
  };

  const activeFiltering = query.trim().length > 0 || roleFilter !== 'all';

  return (
    <div className={`space-y-6 ${className}`}>
      <AdminHeader
        title="Admin management"
        description="Grant and revoke admin access, change roles, and review recent changes."
        icon={ShieldCheck}
        iconTone="primary"
        meta={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
              /
            </kbd>
            <span>to search</span>
            <span className="text-white/20">·</span>
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
              N
            </kbd>
            <span>to add</span>
          </div>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => fetchAll(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-white/20 hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh admin list"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/25"
            >
              <Plus className="h-4 w-4" />
              Add admin
            </button>
          </>
        }
      />

      <StatsRow stats={stats} loading={loading} />

      <section className="rounded-xl border border-white/10 bg-white/[0.02]">
        <Toolbar
          query={query}
          onQuery={(v) => {
            setQuery(v);
            setPage(1);
          }}
          roleFilter={roleFilter}
          onRoleFilter={(v) => {
            setRoleFilter(v);
            setPage(1);
          }}
          counts={stats}
          searchRef={searchRef}
        />

        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            onClear={() => setSelected(new Set())}
            onRevoke={handleBulkRemove}
            busy={bulkBusy}
          />
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-y border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="w-10 px-4 py-3">
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      aria-label={allOnPageSelected ? 'Clear selection' : 'Select page'}
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected;
                      }}
                      onChange={togglePage}
                      className="h-4 w-4 cursor-pointer accent-primary"
                      disabled={pageAdmins.length === 0}
                    />
                  </label>
                </th>
                <SortHeader
                  field="name"
                  activeField={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                  label="User"
                />
                <SortHeader
                  field="role"
                  activeField={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                  label="Role"
                  className="w-40"
                />
                <th scope="col" className="px-4 py-3 font-medium">
                  Granted by
                </th>
                <SortHeader
                  field="createdAt"
                  activeField={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                  label="Added"
                  className="w-40"
                />
                <th scope="col" className="w-24 px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : error && admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <ErrorBlock error={error} onRetry={() => fetchAll()} />
                  </td>
                </tr>
              ) : pageAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <EmptyBlock
                      filtered={activeFiltering}
                      onClear={() => {
                        setQuery('');
                        setRoleFilter('all');
                      }}
                      onAdd={() => setAddOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                pageAdmins.map((admin) => (
                  <AdminRow
                    key={admin.id}
                    admin={admin}
                    selected={selected.has(admin.id)}
                    onToggle={() => toggleRow(admin.id)}
                    onChangeRole={() => setRoleTarget(admin)}
                    onRemove={() => handleRemove(admin)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter
          page={page}
          totalPages={totalPages}
          total={sorted.length}
          onPage={setPage}
        />
      </section>

      <ActivityFeed audit={audit} loading={loading} />

      {addOpen && (
        <AddAdminModal
          onClose={() => setAddOpen(false)}
          onAdd={handleAdd}
          existingEmails={admins.map((a) => a.user.email).filter(Boolean) as string[]}
        />
      )}

      {roleTarget && (
        <RoleChangeModal
          admin={roleTarget}
          onClose={() => setRoleTarget(null)}
          onConfirm={handleRoleChange}
        />
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function StatsRow({
  stats,
  loading,
}: {
  stats: { total: number; supers: number; mods: number; recent: number };
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[118px] animate-pulse rounded-xl border border-white/10 bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard title="Total admins" value={stats.total} icon={Users} tone="primary" />
      <StatsCard
        title="Super admins"
        value={stats.supers}
        icon={Crown}
        tone="accent"
        hint="Full privileges"
      />
      <StatsCard
        title="Moderators"
        value={stats.mods}
        icon={Shield}
        tone="info"
        hint="Moderation only"
      />
      <StatsCard
        title="Changes · 7 days"
        value={stats.recent}
        icon={Activity}
        tone="success"
        hint="Grants, role changes, revokes"
      />
    </div>
  );
}

function Toolbar({
  query,
  onQuery,
  roleFilter,
  onRoleFilter,
  counts,
  searchRef,
}: {
  query: string;
  onQuery: (v: string) => void;
  roleFilter: RoleFilter;
  onRoleFilter: (v: RoleFilter) => void;
  counts: { total: number; supers: number; mods: number };
  searchRef: React.RefObject<HTMLInputElement>;
}) {
  const pills: Array<{ value: RoleFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: counts.total },
    { value: 'super-admin', label: 'Super admins', count: counts.supers },
    { value: 'moderator', label: 'Moderators', count: counts.mods },
  ];
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name, email, username…"
          aria-label="Search admins"
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Filter by role"
        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1"
      >
        {pills.map((p) => {
          const active = roleFilter === p.value;
          return (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onRoleFilter(p.value)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`}
            >
              {p.label}
              <span
                className={`tabular-nums rounded px-1.5 text-[10px] font-semibold ${
                  active ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground'
                }`}
              >
                {p.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BulkBar({
  count,
  onClear,
  onRevoke,
  busy,
}: {
  count: number;
  onClear: () => void;
  onRevoke: () => void;
  busy: boolean;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="flex items-center justify-between gap-3 border-t border-white/10 bg-primary/5 px-4 py-2.5"
    >
      <div className="flex items-center gap-3 text-sm text-foreground">
        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-primary/20 px-1.5 text-xs font-semibold text-primary tabular-nums">
          {count}
        </span>
        <span className="text-muted-foreground">selected</span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Revoke selected
        </button>
      </div>
    </div>
  );
}

function SortHeader({
  field,
  activeField,
  dir,
  onSort,
  label,
  className = '',
}: {
  field: SortField;
  activeField: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  label: string;
  className?: string;
}) {
  const active = activeField === field;
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-3 font-medium ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1.5 rounded transition-colors ${
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>{label}</span>
        <Icon className={`h-3 w-3 ${active ? 'text-primary' : 'text-muted-foreground/60'}`} />
      </button>
    </th>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/5">
          <td className="px-4 py-4">
            <div className="h-4 w-4 animate-pulse rounded bg-white/10" />
          </td>
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
                <div className="h-2.5 w-44 animate-pulse rounded bg-white/5" />
              </div>
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="h-5 w-20 animate-pulse rounded-full bg-white/10" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          </td>
          <td className="px-4 py-4">
            <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-5 w-5 animate-pulse rounded bg-white/10" />
          </td>
        </tr>
      ))}
    </>
  );
}

function AdminRow({
  admin,
  selected,
  onToggle,
  onChangeRole,
  onRemove,
}: {
  admin: AdminPermission;
  selected: boolean;
  onToggle: () => void;
  onChangeRole: () => void;
  onRemove: () => void;
}) {
  const displayName = admin.user.name || admin.user.email || 'Unnamed user';
  const subtitle = admin.user.email || (admin.user.username ? `@${admin.user.username}` : '');

  return (
    <tr
      className={`border-b border-white/5 transition-colors ${
        selected ? 'bg-primary/[0.04]' : 'hover:bg-white/[0.02]'
      }`}
      aria-selected={selected}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          aria-label={`Select ${displayName}`}
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 cursor-pointer accent-primary"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-foreground">
            {initials(displayName)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
              <span className="truncate">{displayName}</span>
              {admin.user.username && (
                <span className="truncate text-xs text-muted-foreground">
                  @{admin.user.username}
                </span>
              )}
            </div>
            {subtitle && (
              <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={admin.role} />
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {admin.grantedByUser?.name || admin.grantedByUser?.email || (
          <span className="text-muted-foreground/50">System</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        <div className="flex flex-col">
          <span>{formatDate(admin.createdAt)}</span>
          <span className="text-xs text-muted-foreground/60">{relativeTime(admin.createdAt)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onChangeRole}
            aria-label={`Change role of ${displayName}`}
            title="Change role"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <ShieldAlert className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Revoke admin access for ${displayName}`}
            title="Revoke access"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-error/15 hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function RoleBadge({ role }: { role: AdminRole }) {
  if (role === 'super-admin') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-primary">
        <Crown className="h-3 w-3" />
        Super admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-info">
      <Shield className="h-3 w-3" />
      Moderator
    </span>
  );
}

function PaginationFooter({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      aria-live="polite"
      className="flex flex-col-reverse items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-muted-foreground sm:flex-row"
    >
      <div className="tabular-nums">
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing <span className="text-foreground">{from}</span>
            {' – '}
            <span className="text-foreground">{to}</span> of{' '}
            <span className="text-foreground">{total}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <PagerBtn onClick={() => onPage(1)} disabled={!canPrev} label="First page">
          <ChevronsLeft className="h-4 w-4" />
        </PagerBtn>
        <PagerBtn onClick={() => onPage(page - 1)} disabled={!canPrev} label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </PagerBtn>
        <span className="px-2 tabular-nums">
          Page <span className="text-foreground">{page}</span> / {totalPages}
        </span>
        <PagerBtn onClick={() => onPage(page + 1)} disabled={!canNext} label="Next page">
          <ChevronRight className="h-4 w-4" />
        </PagerBtn>
        <PagerBtn onClick={() => onPage(totalPages)} disabled={!canNext} label="Last page">
          <ChevronsRight className="h-4 w-4" />
        </PagerBtn>
      </div>
    </div>
  );
}

function PagerBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
    >
      {children}
    </button>
  );
}

function EmptyBlock({
  filtered,
  onClear,
  onAdd,
}: {
  filtered: boolean;
  onClear: () => void;
  onAdd: () => void;
}) {
  if (filtered) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No admins match</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Try a different search or clear the filters to see all admins.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/10"
        >
          Clear filters
        </button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Shield className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">No admins yet</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Add users to grant them access to the admin dashboard. The user must already have an
        account.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
      >
        <Plus className="h-3.5 w-3.5" />
        Add your first admin
      </button>
    </div>
  );
}

function ErrorBlock({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
        <AlertTriangle className="h-6 w-6 text-error" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">Couldn&rsquo;t load admins</h3>
      <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/10"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}

function ActivityFeed({ audit, loading }: { audit: AuditEntry[]; loading: boolean }) {
  const items = audit.slice(0, 10);
  return (
    <section
      aria-labelledby="admin-activity-title"
      className="rounded-xl border border-white/10 bg-white/[0.02]"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 id="admin-activity-title" className="text-sm font-semibold text-foreground">
            Recent admin activity
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">Last {AUDIT_LIMIT} events</span>
      </header>
      <div>
        {loading ? (
          <ul className="divide-y divide-white/5">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-7 w-7 animate-pulse rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/5" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <Inbox className="mb-2 h-6 w-6 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">No admin changes in the audit log yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((entry) => (
              <ActivityItem key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ActivityItem({ entry }: { entry: AuditEntry }) {
  const { tone, Icon, verb } = auditMeta(entry.action);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div
        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border ${tone}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground">
          <span className="font-medium">{entry.admin?.name || entry.admin?.email || 'System'}</span>
          <span className="text-muted-foreground"> {verb} </span>
          <span className="text-foreground">{entry.summary || 'an admin'}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{relativeTime(entry.createdAt)}</span>
          <span className="text-white/20">·</span>
          <span>{formatDate(entry.createdAt)}</span>
        </div>
      </div>
    </li>
  );
}

function auditMeta(action: string): {
  tone: string;
  Icon: typeof Shield;
  verb: string;
} {
  switch (action) {
    case 'admin.grant':
      return {
        tone: 'border-success/30 bg-success/10 text-success',
        Icon: Plus,
        verb: 'granted access to',
      };
    case 'admin.revoke':
      return {
        tone: 'border-error/30 bg-error/10 text-error',
        Icon: Trash2,
        verb: 'revoked access from',
      };
    case 'admin.update':
      return {
        tone: 'border-primary/30 bg-primary/10 text-primary',
        Icon: ShieldAlert,
        verb: 'updated',
      };
    default:
      return {
        tone: 'border-white/15 bg-white/5 text-muted-foreground',
        Icon: Activity,
        verb: 'changed',
      };
  }
}

// ---------- Modals ----------

function AddAdminModal({
  onClose,
  onAdd,
  existingEmails,
}: {
  onClose: () => void;
  onAdd: (email: string, role: AdminRole) => Promise<void>;
  existingEmails: string[];
}) {
  const toast = useAdminToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('moderator');
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [touched, setTouched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const duplicate = useMemo(() => {
    const e = email.trim().toLowerCase();
    if (!e) return false;
    return existingEmails.some((x) => x.toLowerCase() === e);
  }, [email, existingEmails]);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = validEmail && !duplicate && !submitting;

  const handleEmail = (value: string) => {
    setEmail(value);
    setTouched(true);
    setActiveIdx(-1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSug(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          const list: UserSuggestion[] = Array.isArray(data?.users) ? data.users : [];
          setSuggestions(list);
          setShowSug(list.length > 0);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const pickSuggestion = (s: UserSuggestion) => {
    setEmail(s.email);
    setShowSug(false);
    setSuggestions([]);
    setActiveIdx(-1);
  };

  const handleInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!showSug || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIdx]);
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onAdd(email.trim(), role);
      onClose();
    } catch (err) {
      toast.push({
        tone: 'error',
        title: 'Could not add admin',
        description: err instanceof Error ? err.message : 'Unexpected error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-admin-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#16181d] p-6 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="add-admin-title" className="text-base font-semibold text-foreground">
                Add admin
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Grant admin access to an existing user by email.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="relative">
            <label htmlFor="add-admin-email" className="mb-1.5 block text-xs font-medium text-foreground">
              User email <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="add-admin-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => handleEmail(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                onKeyDown={handleInputKey}
                aria-invalid={touched && (!validEmail || duplicate)}
                aria-describedby="add-admin-email-help"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="user@example.com"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {showSug && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute left-0 right-0 z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#16181d] py-1 shadow-xl"
              >
                {suggestions.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeIdx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickSuggestion(s);
                      }}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        i === activeIdx ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-white/5'
                      }`}
                    >
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-muted-foreground">
                        {initials(s.name || s.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-foreground">{s.name || 'Unnamed user'}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.email}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p
              id="add-admin-email-help"
              role={touched && (duplicate || (!validEmail && email)) ? 'alert' : undefined}
              className={`mt-1.5 text-xs ${
                touched && duplicate
                  ? 'text-error'
                  : touched && email && !validEmail
                    ? 'text-error'
                    : 'text-muted-foreground'
              }`}
            >
              {touched && duplicate
                ? 'This user is already an admin.'
                : touched && email && !validEmail
                  ? 'Enter a valid email address.'
                  : 'Start typing to search existing users.'}
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-foreground">Role</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(['moderator', 'super-admin'] as const).map((r) => {
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r === 'super-admin' ? (
                        <Crown className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      ) : (
                        <Shield className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      )}
                      <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-foreground/80'}`}>
                        {ROLE_LABEL[r]}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {ROLE_BLURB[r]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {role === 'super-admin' && (
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning/10 p-3"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
              <p className="text-xs text-warning/90">
                Super admins can manage other admins, feature flags, database, and broadcasts. Grant
                with care.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Grant access
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleChangeModal({
  admin,
  onClose,
  onConfirm,
}: {
  admin: AdminPermission;
  onClose: () => void;
  onConfirm: (admin: AdminPermission, nextRole: AdminRole) => Promise<void>;
}) {
  const toast = useAdminToast();
  const otherRole: AdminRole = admin.role === 'super-admin' ? 'moderator' : 'super-admin';
  const [nextRole, setNextRole] = useState<AdminRole>(otherRole);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isPromote = admin.role === 'moderator' && nextRole === 'super-admin';
  const isDemote = admin.role === 'super-admin' && nextRole === 'moderator';
  const unchanged = nextRole === admin.role;

  const submit = async () => {
    if (unchanged) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(admin, nextRole);
      onClose();
    } catch (err) {
      toast.push({
        tone: 'error',
        title: 'Could not change role',
        description: err instanceof Error ? err.message : 'Unexpected error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = admin.user.name || admin.user.email || 'This user';

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16181d] p-6 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 id="role-modal-title" className="text-base font-semibold text-foreground">
                Change role
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Update the role for <span className="text-foreground">{displayName}</span>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</div>
            <RoleBadge role={admin.role} />
          </div>
          <ArrowUp className="h-4 w-4 rotate-90 text-muted-foreground" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">New</div>
            <RoleBadge role={nextRole} />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(['moderator', 'super-admin'] as const).map((r) => {
            const active = nextRole === r;
            const current = admin.role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setNextRole(r)}
                aria-pressed={active}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {r === 'super-admin' ? (
                    <Crown className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  ) : (
                    <Shield className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                  <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-foreground/80'}`}>
                    {ROLE_LABEL[r]}
                  </span>
                  {current && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {ROLE_BLURB[r]}
                </p>
              </button>
            );
          })}
        </div>

        {isPromote && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            <p className="text-xs text-warning/90">
              Promoting to super admin grants full control — admin management, feature flags,
              database, and broadcast.
            </p>
          </div>
        )}

        {isDemote && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-info/25 bg-info/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
            <p className="text-xs text-info/90">
              Demoting to moderator removes super-admin privileges. The env-configured super admin
              cannot be demoted.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || unchanged}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {unchanged ? 'No change' : 'Confirm change'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function initials(input: string) {
  const parts = input.trim().split(/\s+|@|\./).filter(Boolean);
  if (parts.length === 0) return '?';
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function relativeTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(mo / 12);
  return `${yr}y ago`;
}
