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
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Copy,
  Database,
  Eye,
  FileJson,
  Keyboard,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';

import AdminHeader from '@/components/admin/AdminHeader';
import BulkActionBar from '@/components/admin/BulkActionBar';
import { useAdminToast } from '@/components/admin/AdminToast';
import { downloadCSV } from '@/lib/csv';
import {
  DATABASE_PAGE_SIZES,
  type DatabasePageSize,
  type SchemaField,
  copyToClipboard,
  fieldBadge,
  flattenForExport,
  formatCell,
  formatFull,
  isValidPageSize,
  valueBadge,
} from '@/lib/databaseAdmin';

interface TableInfo {
  name: string;
  displayName: string;
  count: number;
  writable: boolean;
}

interface TablesResponse {
  tables: TableInfo[];
  stats: { tables: number; totalRecords: number; writableTables: number };
}

interface SchemaResponse {
  table: string;
  displayName: string;
  writable: boolean;
  fields: SchemaField[];
}

interface RecordsResponse {
  records: Record<string, unknown>[];
  pagination: { page: number; limit: number; total: number; pages: number };
  order: { field: string; dir: 'asc' | 'desc' };
  search: { q: string; fields: string[] };
  writable: boolean;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const COLUMN_PREFS_KEY = 'admin.db.columnPrefs.v1';

function loadColumnPrefs(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(COLUMN_PREFS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function saveColumnPrefs(prefs: Record<string, string[]>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
}

export default function DatabaseViewer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();

  const urlTable = searchParams.get('table') || '';
  const urlQ = searchParams.get('q') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const urlLimitRaw = parseInt(searchParams.get('limit') || '50', 10);
  const urlLimit: DatabasePageSize = isValidPageSize(urlLimitRaw) ? urlLimitRaw : 50;
  const urlOrderBy = searchParams.get('orderBy') || '';
  const urlOrderDir: 'asc' | 'desc' = searchParams.get('orderDir') === 'asc' ? 'asc' : 'desc';
  const urlRecordId = searchParams.get('record');

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [stats, setStats] = useState<TablesResponse['stats'] | null>(null);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');

  const [selectedTable, setSelectedTable] = useState<string>(urlTable);
  const [schema, setSchema] = useState<SchemaField[] | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const [searchText, setSearchText] = useState(urlQ);
  const debouncedSearch = useDebounced(searchText, 300);

  const [page, setPage] = useState(Number.isFinite(urlPage) && urlPage > 0 ? urlPage : 1);
  const [pageSize, setPageSize] = useState<DatabasePageSize>(urlLimit);
  const [orderBy, setOrderBy] = useState(urlOrderBy);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>(urlOrderDir);

  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [pagination, setPagination] = useState<RecordsResponse['pagination']>({
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 1,
  });
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [writable, setWritable] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeRecord, setActiveRecord] = useState<Record<string, unknown> | null>(null);

  const [columnPrefs, setColumnPrefs] = useState<Record<string, string[]>>({});
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [pageJump, setPageJump] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setColumnPrefs(loadColumnPrefs());
  }, []);

  const fetchTables = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setTablesLoading(true);
      setTablesError(null);
      try {
        const res = await fetch('/api/admin/db/tables', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as TablesResponse;
        setTables(data.tables);
        setStats(data.stats);
        if (!selectedTable && data.tables.length > 0) {
          setSelectedTable(data.tables[0]!.name);
        }
      } catch (err) {
        setTablesError(err instanceof Error ? err.message : 'Failed to load tables');
      } finally {
        setTablesLoading(false);
      }
    },
    [selectedTable],
  );

  useEffect(() => {
    void fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (!selectedTable) {
      setSchema(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setSchemaLoading(true);
      try {
        const res = await fetch(`/api/admin/db/${selectedTable}/schema`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as SchemaResponse;
        if (!cancelled) setSchema(data.fields);
      } catch {
        if (!cancelled) setSchema(null);
      } finally {
        if (!cancelled) setSchemaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTable]);

  const fetchRecords = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!selectedTable) return;
      if (!opts?.silent) setRecordsLoading(true);
      setRefreshing(true);
      setRecordsError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(pageSize));
        if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
        if (orderBy) params.set('orderBy', orderBy);
        params.set('orderDir', orderDir);
        const res = await fetch(`/api/admin/db/${selectedTable}?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const data = (await res.json()) as RecordsResponse;
        setRecords(data.records || []);
        setPagination(data.pagination);
        setWritable(data.writable);
      } catch (err) {
        setRecordsError(err instanceof Error ? err.message : 'Failed to load records');
        setRecords([]);
      } finally {
        setRecordsLoading(false);
        setRefreshing(false);
      }
    },
    [selectedTable, page, pageSize, debouncedSearch, orderBy, orderDir],
  );

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTable) params.set('table', selectedTable);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (page !== 1) params.set('page', String(page));
    if (pageSize !== 50) params.set('limit', String(pageSize));
    if (orderBy) params.set('orderBy', orderBy);
    if (orderDir !== 'desc') params.set('orderDir', orderDir);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [selectedTable, debouncedSearch, page, pageSize, orderBy, orderDir, router]);

  useEffect(() => {
    if (!selectedTable || !urlRecordId || activeRecord) return;
    const match = records.find((r) => (r as { id?: string }).id === urlRecordId);
    if (match) setActiveRecord(match);
  }, [records, selectedTable, urlRecordId, activeRecord]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedTable, page, pageSize]);

  const selectedTableInfo = useMemo(
    () => tables.find((t) => t.name === selectedTable) ?? null,
    [tables, selectedTable],
  );

  const filteredTables = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(
      (t) => t.name.toLowerCase().includes(q) || t.displayName.toLowerCase().includes(q),
    );
  }, [tables, tableFilter]);

  const allColumns = useMemo(() => {
    if (schema) {
      return schema.filter((f) => f.kind === 'scalar' || f.kind === 'enum').map((f) => f.name);
    }
    return records[0] ? Object.keys(records[0]) : [];
  }, [schema, records]);

  const visibleColumns = useMemo(() => {
    const prefs = columnPrefs[selectedTable];
    if (prefs && prefs.length > 0) return prefs.filter((c) => allColumns.includes(c));
    return allColumns.slice(0, Math.min(allColumns.length, 8));
  }, [columnPrefs, selectedTable, allColumns]);

  const updateVisibleColumns = useCallback(
    (cols: string[]) => {
      setColumnPrefs((prev) => {
        const next = { ...prev, [selectedTable]: cols };
        saveColumnPrefs(next);
        return next;
      });
    },
    [selectedTable],
  );

  const resetColumns = useCallback(() => {
    setColumnPrefs((prev) => {
      const next = { ...prev };
      delete next[selectedTable];
      saveColumnPrefs(next);
      return next;
    });
  }, [selectedTable]);

  const toggleColumn = useCallback(
    (col: string) => {
      const cur = visibleColumns;
      if (cur.includes(col)) updateVisibleColumns(cur.filter((c) => c !== col));
      else updateVisibleColumns([...cur, col]);
    },
    [visibleColumns, updateVisibleColumns],
  );

  const toggleSort = useCallback(
    (col: string) => {
      if (orderBy === col) {
        setOrderDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setOrderBy(col);
        setOrderDir('desc');
      }
      setPage(1);
    },
    [orderBy],
  );

  const schemaByName = useMemo(() => {
    const map = new Map<string, SchemaField>();
    schema?.forEach((f) => map.set(f.name, f));
    return map;
  }, [schema]);

  const handleRowCopyId = useCallback(
    async (id: unknown) => {
      if (typeof id !== 'string') return;
      const ok = await copyToClipboard(id);
      toast.push({
        title: ok ? 'ID copied' : 'Copy failed',
        description: ok ? id : 'Clipboard unavailable',
        tone: ok ? 'success' : 'error',
      });
    },
    [toast],
  );

  const handleDelete = useCallback(
    async (ids: string[]) => {
      if (!selectedTable || !writable || ids.length === 0) return;
      const ok = await toast.confirm({
        title: `Delete ${ids.length} record${ids.length === 1 ? '' : 's'}?`,
        description: `This will permanently remove ${ids.length === 1 ? 'this row' : 'these rows'} from ${selectedTableInfo?.displayName ?? selectedTable}. This cannot be undone.`,
        confirmLabel: 'Delete',
        tone: 'danger',
      });
      if (!ok) return;

      try {
        const res = await fetch(`/api/admin/db/${selectedTable}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ids.length === 1 ? { id: ids[0] } : { ids }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        toast.push({
          title: body.message || 'Deleted',
          tone: body.failed > 0 ? 'warning' : 'success',
        });
        setActiveRecord(null);
        setSelectedIds(new Set());
        void fetchRecords({ silent: true });
        void fetchTables({ silent: true });
      } catch (err) {
        toast.push({
          title: 'Delete failed',
          description: err instanceof Error ? err.message : 'Unknown error',
          tone: 'error',
        });
      }
    },
    [selectedTable, writable, selectedTableInfo, toast, fetchRecords, fetchTables],
  );

  const handleExport = useCallback(() => {
    if (records.length === 0) {
      toast.push({ title: 'Nothing to export', tone: 'info' });
      return;
    }
    const source =
      selectedIds.size > 0
        ? records.filter((r) => {
            const id = (r as { id?: string }).id;
            return typeof id === 'string' && selectedIds.has(id);
          })
        : records;
    if (source.length === 0) {
      toast.push({ title: 'Nothing to export', tone: 'info' });
      return;
    }
    const rows = source.map((r) => flattenForExport(r));
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`${selectedTable}-${stamp}`, rows);
    toast.push({
      title: `Exported ${rows.length} row${rows.length === 1 ? '' : 's'}`,
      tone: 'success',
    });
  }, [records, selectedIds, selectedTable, toast]);

  const moveSelection = useCallback(
    (delta: 1 | -1) => {
      if (records.length === 0) return;
      const ids = records
        .map((r) => (r as { id?: string }).id)
        .filter((v): v is string => typeof v === 'string');
      if (ids.length === 0) return;
      const currentId =
        activeRecord && typeof activeRecord.id === 'string' ? (activeRecord.id as string) : null;
      const idx = currentId ? ids.indexOf(currentId) : -1;
      const nextIdx = idx < 0 ? 0 : Math.min(ids.length - 1, Math.max(0, idx + delta));
      const next = records.find((r) => (r as { id?: string }).id === ids[nextIdx]);
      if (next) setActiveRecord(next);
    },
    [records, activeRecord],
  );

  useEffect(() => {
    const isInInput = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isInInput(e.target)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        if (activeRecord) {
          setActiveRecord(null);
          return;
        }
        if (columnPickerOpen) {
          setColumnPickerOpen(false);
          return;
        }
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
      }
      if (isInInput(e.target)) return;
      if (e.key === 'j') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'k') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'r') {
        e.preventDefault();
        void fetchRecords({ silent: true });
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey as unknown as EventListener);
    return () => window.removeEventListener('keydown', onKey as unknown as EventListener);
  }, [activeRecord, columnPickerOpen, showShortcuts, fetchRecords, moveSelection]);

  const pageIds = useMemo(
    () =>
      records
        .map((r) => (r as { id?: string }).id)
        .filter((v): v is string => typeof v === 'string'),
    [records],
  );
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.has(id));

  const togglePageSelection = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleRowSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePageJump = () => {
    const n = parseInt(pageJump, 10);
    if (Number.isFinite(n) && n >= 1 && n <= pagination.pages) {
      setPage(n);
    }
    setPageJump('');
  };

  const statsMeta = stats ? (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>
        <span className="font-semibold text-foreground tabular-nums">{stats.tables}</span> tables
      </span>
      <span>
        <span className="font-semibold text-foreground tabular-nums">
          {stats.totalRecords.toLocaleString()}
        </span>{' '}
        records
      </span>
      <span>
        <span className="font-semibold text-foreground tabular-nums">{stats.writableTables}</span>{' '}
        writable
      </span>
    </div>
  ) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background p-6">
      <AdminHeader
        title="Database"
        description="Browse, search, and manage rows across every Prisma model."
        icon={Database}
        iconTone="primary"
        meta={statsMeta}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              aria-label="Show keyboard shortcuts"
            >
              <Keyboard className="h-3.5 w-3.5" />
              Shortcuts
            </button>
            <button
              type="button"
              onClick={() => {
                void fetchRecords({ silent: true });
                void fetchTables({ silent: true });
              }}
              disabled={refreshing || recordsLoading}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-white/10 hover:text-foreground disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <TableSidebar
          tables={filteredTables}
          allTables={tables}
          loading={tablesLoading}
          error={tablesError}
          selectedTable={selectedTable}
          filter={tableFilter}
          onFilterChange={setTableFilter}
          onSelect={(name) => {
            setSelectedTable(name);
            setPage(1);
            setOrderBy('');
            setOrderDir('desc');
            setSearchText('');
          }}
          onRetry={() => void fetchTables()}
        />

        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#16181d]">
          {selectedTable ? (
            <>
              <Toolbar
                displayName={selectedTableInfo?.displayName ?? selectedTable}
                writable={writable}
                searchText={searchText}
                onSearchChange={(v) => {
                  setSearchText(v);
                  setPage(1);
                }}
                searchInputRef={searchInputRef}
                pageSize={pageSize}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
                columnPickerOpen={columnPickerOpen}
                onToggleColumnPicker={() => setColumnPickerOpen((v) => !v)}
                onExport={handleExport}
                recordCount={records.length}
                selectedCount={selectedIds.size}
                totalCount={pagination.total}
                refreshing={refreshing}
              />

              {columnPickerOpen && (
                <ColumnPicker
                  columns={allColumns}
                  visible={visibleColumns}
                  onToggle={toggleColumn}
                  onReset={resetColumns}
                  onClose={() => setColumnPickerOpen(false)}
                />
              )}

              <div className="flex-1 min-h-0 overflow-auto">
                {recordsLoading ? (
                  <TableSkeleton columns={Math.max(3, visibleColumns.length)} />
                ) : recordsError ? (
                  <ErrorPanel
                    message={recordsError}
                    onRetry={() => void fetchRecords()}
                  />
                ) : records.length === 0 ? (
                  <EmptyState
                    hasSearch={debouncedSearch.trim().length > 0}
                    onClearSearch={() => setSearchText('')}
                  />
                ) : (
                  <DataTable
                    records={records}
                    columns={visibleColumns}
                    orderBy={orderBy}
                    orderDir={orderDir}
                    onToggleSort={toggleSort}
                    activeRecordId={
                      activeRecord && typeof activeRecord.id === 'string'
                        ? (activeRecord.id as string)
                        : null
                    }
                    selectedIds={selectedIds}
                    onRowClick={(r) => setActiveRecord(r)}
                    onRowSelect={toggleRowSelect}
                    onAllSelect={togglePageSelection}
                    allPageSelected={allOnPageSelected}
                    somePageSelected={someOnPageSelected}
                    onCopyId={handleRowCopyId}
                    onDelete={(id) => void handleDelete([id])}
                    writable={writable}
                    schemaByName={schemaByName}
                  />
                )}
              </div>

              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                limit={pagination.limit}
                onFirst={() => setPage(1)}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                onLast={() => setPage(pagination.pages)}
                pageJump={pageJump}
                onPageJumpChange={setPageJump}
                onPageJumpSubmit={handlePageJump}
                searchFields={debouncedSearch.trim() ? schema?.filter((f) => f.type === 'String' && !f.isList).map((f) => f.name) ?? [] : []}
                orderBy={orderBy}
                orderDir={orderDir}
              />
            </>
          ) : tablesLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <Database className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select a table to begin</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          actions={[
            {
              label: 'Export selected',
              icon: FileJson,
              tone: 'neutral',
              onClick: handleExport,
            },
            ...(writable
              ? [
                  {
                    label: 'Delete selected',
                    icon: Trash2,
                    tone: 'error' as const,
                    onClick: () => handleDelete(Array.from(selectedIds)),
                  },
                ]
              : []),
          ]}
        />
      )}

      {activeRecord && (
        <RecordDetailModal
          tableName={selectedTable}
          tableDisplayName={selectedTableInfo?.displayName ?? selectedTable}
          record={activeRecord}
          schemaByName={schemaByName}
          writable={writable}
          onClose={() => setActiveRecord(null)}
          onDelete={(id) => void handleDelete([id])}
        />
      )}

      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

/* ----------------------------- Sidebar ---------------------------------- */

interface TableSidebarProps {
  tables: TableInfo[];
  allTables: TableInfo[];
  loading: boolean;
  error: string | null;
  selectedTable: string;
  filter: string;
  onFilterChange: (v: string) => void;
  onSelect: (name: string) => void;
  onRetry: () => void;
}

function TableSidebar({
  tables,
  allTables,
  loading,
  error,
  selectedTable,
  filter,
  onFilterChange,
  onSelect,
  onRetry,
}: TableSidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#16181d]">
      <div className="border-b border-white/10 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={filter}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value)}
            placeholder="Filter tables…"
            aria-label="Filter tables"
            className="w-full rounded-md border border-white/10 bg-[#1a1b23] py-1.5 pl-7 pr-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {loading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="p-3 text-center">
            <AlertTriangle className="mx-auto mb-2 h-4 w-4 text-red-300" />
            <p className="text-xs text-red-300">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : tables.length === 0 ? (
          <p className="p-3 text-center text-xs text-muted-foreground">
            No tables match &quot;{filter}&quot;
          </p>
        ) : (
          <ul className="space-y-0.5">
            {tables.map((t) => {
              const active = t.name === selectedTable;
              return (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.name)}
                    className={`group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
                      active
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    }`}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {t.writable ? (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                      ) : (
                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                      )}
                      <span className="truncate">{t.displayName}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                        active ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'
                      }`}
                    >
                      {t.count.toLocaleString()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && !error && allTables.length > 0 && (
        <div className="border-t border-white/10 px-3 py-2 text-[10px] text-muted-foreground">
          Showing {tables.length} of {allTables.length}
        </div>
      )}
    </aside>
  );
}

/* ------------------------------ Toolbar --------------------------------- */

interface ToolbarProps {
  displayName: string;
  writable: boolean;
  searchText: string;
  onSearchChange: (v: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  pageSize: DatabasePageSize;
  onPageSizeChange: (n: DatabasePageSize) => void;
  columnPickerOpen: boolean;
  onToggleColumnPicker: () => void;
  onExport: () => void;
  recordCount: number;
  selectedCount: number;
  totalCount: number;
  refreshing: boolean;
}

function Toolbar({
  displayName,
  writable,
  searchText,
  onSearchChange,
  searchInputRef,
  pageSize,
  onPageSizeChange,
  columnPickerOpen,
  onToggleColumnPicker,
  onExport,
  recordCount,
  selectedCount,
  totalCount,
  refreshing,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#14161b] px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-sm font-semibold text-foreground">{displayName}</h2>
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
            writable
              ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
              : 'border-white/10 bg-white/5 text-muted-foreground'
          }`}
        >
          {writable ? (
            <>
              <Shield className="h-2.5 w-2.5" /> Writable
            </>
          ) : (
            <>
              <Lock className="h-2.5 w-2.5" /> Read-only
            </>
          )}
        </span>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">·</span>
        <span className="hidden text-[11px] text-muted-foreground sm:inline tabular-nums">
          {selectedCount > 0 && `${selectedCount} selected · `}
          {recordCount} of {totalCount.toLocaleString()}
          {refreshing && <Loader2 className="ml-1 inline h-2.5 w-2.5 animate-spin" />}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
            placeholder="Search… (/)"
            aria-label="Search records"
            className="w-44 rounded-md border border-white/10 bg-[#1a1b23] py-1.5 pl-7 pr-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-muted-foreground">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10) as DatabasePageSize)}
            className="bg-transparent text-foreground focus:outline-none"
            aria-label="Rows per page"
          >
            {DATABASE_PAGE_SIZES.map((n) => (
              <option key={n} value={n} className="bg-[#1a1b23]">
                {n}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onToggleColumnPicker}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition ${
            columnPickerOpen
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
          }`}
          aria-expanded={columnPickerOpen}
        >
          <Columns3 className="h-3.5 w-3.5" />
          Columns
        </button>

        <button
          type="button"
          onClick={onExport}
          disabled={recordCount === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-white/10 hover:text-foreground disabled:opacity-50"
        >
          <FileJson className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>
    </div>
  );
}

/* ---------------------------- Column picker ---------------------------- */

interface ColumnPickerProps {
  columns: string[];
  visible: string[];
  onToggle: (col: string) => void;
  onReset: () => void;
  onClose: () => void;
}

function ColumnPicker({ columns, visible, onToggle, onReset, onClose }: ColumnPickerProps) {
  return (
    <div className="border-b border-white/10 bg-[#14161b] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Visible columns · {visible.length} of {columns.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close column picker"
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {columns.map((col) => {
          const active = visible.includes(col);
          return (
            <button
              key={col}
              type="button"
              onClick={() => onToggle(col)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                active
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
              }`}
            >
              {active && <Check className="h-2.5 w-2.5" />}
              {col}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Data table ------------------------------ */

interface DataTableProps {
  records: Record<string, unknown>[];
  columns: string[];
  orderBy: string;
  orderDir: 'asc' | 'desc';
  onToggleSort: (col: string) => void;
  activeRecordId: string | null;
  selectedIds: Set<string>;
  onRowClick: (r: Record<string, unknown>) => void;
  onRowSelect: (id: string) => void;
  onAllSelect: () => void;
  allPageSelected: boolean;
  somePageSelected: boolean;
  onCopyId: (id: unknown) => void;
  onDelete: (id: string) => void;
  writable: boolean;
  schemaByName: Map<string, SchemaField>;
}

function DataTable({
  records,
  columns,
  orderBy,
  orderDir,
  onToggleSort,
  activeRecordId,
  selectedIds,
  onRowClick,
  onRowSelect,
  onAllSelect,
  allPageSelected,
  somePageSelected,
  onCopyId,
  onDelete,
  writable,
  schemaByName,
}: DataTableProps) {
  return (
    <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
      <thead className="sticky top-0 z-10 bg-[#14161b]">
        <tr>
          <th className="sticky left-0 z-20 border-b border-white/10 bg-[#14161b] px-3 py-2 text-left">
            <input
              type="checkbox"
              checked={allPageSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allPageSelected && somePageSelected;
              }}
              onChange={onAllSelect}
              aria-label="Select all on page"
              className="h-3.5 w-3.5 rounded accent-primary"
            />
          </th>
          {columns.map((col) => {
            const f = schemaByName.get(col);
            const badge = f ? fieldBadge(f) : null;
            const active = orderBy === col;
            return (
              <th
                key={col}
                className="border-b border-white/10 px-3 py-2 text-left font-medium"
              >
                <button
                  type="button"
                  onClick={() => onToggleSort(col)}
                  className="group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
                  aria-sort={active ? (orderDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <span className="font-mono normal-case tracking-normal">{col}</span>
                  {badge && (
                    <span
                      className={`inline-flex items-center rounded px-1 text-[9px] font-normal ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  )}
                  {active ? (
                    orderDir === 'asc' ? (
                      <ArrowUp className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                  )}
                </button>
              </th>
            );
          })}
          <th className="sticky right-0 z-20 border-b border-white/10 bg-[#14161b] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {records.map((record, rowIdx) => {
          const id = typeof record.id === 'string' ? (record.id as string) : null;
          const isSelected = id != null && selectedIds.has(id);
          const isActive = id != null && id === activeRecordId;
          return (
            <tr
              key={id ?? rowIdx}
              onClick={() => onRowClick(record)}
              className={`group cursor-pointer transition ${
                isActive
                  ? 'bg-primary/10'
                  : isSelected
                    ? 'bg-white/5'
                    : 'hover:bg-white/[0.03]'
              }`}
            >
              <td
                className="sticky left-0 z-10 border-b border-white/5 bg-inherit px-3 py-2"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => id && onRowSelect(id)}
                  disabled={id == null}
                  aria-label={`Select row ${rowIdx + 1}`}
                  className="h-3.5 w-3.5 rounded accent-primary"
                />
              </td>
              {columns.map((col) => {
                const value = record[col];
                const badge = valueBadge(value);
                return (
                  <td key={col} className="border-b border-white/5 px-3 py-2">
                    <div className="flex max-w-xs items-center gap-2">
                      <span
                        className={`inline-flex shrink-0 items-center rounded px-1 text-[9px] font-medium ${badge.className}`}
                        title={badge.label}
                      >
                        {badge.label.charAt(0)}
                      </span>
                      <span className="truncate font-mono text-xs text-foreground">
                        {formatCell(value, { max: 60 })}
                      </span>
                    </div>
                  </td>
                );
              })}
              <td
                className="sticky right-0 z-10 border-b border-white/5 bg-inherit px-3 py-2 text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    type="button"
                    onClick={() => onRowClick(record)}
                    aria-label="View record"
                    className="rounded p-1 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  {id && (
                    <button
                      type="button"
                      onClick={() => onCopyId(id)}
                      aria-label="Copy ID"
                      className="rounded p-1 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {writable && id && (
                    <button
                      type="button"
                      onClick={() => onDelete(id)}
                      aria-label="Delete record"
                      className="rounded p-1 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ------------------------------ Pagination ------------------------------ */

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageJump: string;
  onPageJumpChange: (v: string) => void;
  onPageJumpSubmit: () => void;
  searchFields: string[];
  orderBy: string;
  orderDir: 'asc' | 'desc';
}

function Pagination({
  page,
  pages,
  total,
  limit,
  onFirst,
  onPrev,
  onNext,
  onLast,
  pageJump,
  onPageJumpChange,
  onPageJumpSubmit,
  searchFields,
  orderBy,
  orderDir,
}: PaginationProps) {
  if (pages <= 0) return null;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#14161b] px-3 py-2">
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          <span className="text-foreground font-medium">{start.toLocaleString()}</span>–
          <span className="text-foreground font-medium">{end.toLocaleString()}</span> of{' '}
          <span className="text-foreground font-medium">{total.toLocaleString()}</span>
        </span>
        {orderBy && (
          <span className="inline-flex items-center gap-1">
            Sort: <span className="font-mono text-foreground">{orderBy}</span>
            {orderDir === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
          </span>
        )}
        {searchFields.length > 0 && (
          <span className="hidden sm:inline">
            Searched {searchFields.length} string column{searchFields.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onFirst}
          disabled={page <= 1}
          aria-label="First page"
          className="rounded p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          Page{' '}
          <input
            type="text"
            inputMode="numeric"
            value={pageJump || page}
            onChange={(e) => onPageJumpChange(e.target.value.replace(/\D/g, ''))}
            onBlur={onPageJumpSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onPageJumpSubmit();
              }
            }}
            className="mx-1 w-10 rounded border border-white/10 bg-[#1a1b23] px-1 py-0.5 text-center text-foreground focus:border-primary/40 focus:outline-none"
            aria-label="Page number"
          />
          of <span className="text-foreground">{pages}</span>
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pages}
          aria-label="Next page"
          className="rounded p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onLast}
          disabled={page >= pages}
          aria-label="Last page"
          className="rounded p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- States --------------------------------- */

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="animate-pulse p-3">
      <div className="mb-2 flex gap-2">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 w-24 rounded bg-white/10" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="mb-1 flex gap-2">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-5 w-24 rounded bg-white/5" />
          ))}
        </div>
      ))}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
        <AlertTriangle className="h-5 w-5 text-red-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Could not load records</p>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:bg-white/10"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}

function EmptyState({
  hasSearch,
  onClearSearch,
}: {
  hasSearch: boolean;
  onClearSearch: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Database className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">
          {hasSearch ? 'No matching rows' : 'Table is empty'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasSearch ? 'Try a different search term.' : 'Add data to see it here.'}
        </p>
      </div>
      {hasSearch && (
        <button
          type="button"
          onClick={onClearSearch}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Clear search
        </button>
      )}
    </div>
  );
}

/* --------------------------- Detail modal ------------------------------ */

interface RecordDetailModalProps {
  tableName: string;
  tableDisplayName: string;
  record: Record<string, unknown>;
  schemaByName: Map<string, SchemaField>;
  writable: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function RecordDetailModal({
  tableName,
  tableDisplayName,
  record,
  schemaByName,
  writable,
  onClose,
  onDelete,
}: RecordDetailModalProps) {
  const [mode, setMode] = useState<'formatted' | 'json'>('formatted');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const entries = Object.entries(record);
  const recordId = typeof record.id === 'string' ? (record.id as string) : null;

  const handleFieldCopy = async (key: string, value: unknown) => {
    const text = typeof value === 'string' ? value : formatFull(value);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    }
  };

  const copyAll = async () => {
    const ok = await copyToClipboard(JSON.stringify(record, null, 2));
    if (ok) {
      setCopiedKey('__all__');
      setTimeout(() => setCopiedKey((k) => (k === '__all__' ? null : k)), 1500);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Record details"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1b23] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">Record details</h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-medium">
                  {tableDisplayName}
                </span>
                {recordId && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-primary">{recordId}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="inline-flex overflow-hidden rounded-md border border-white/10">
              <button
                type="button"
                onClick={() => setMode('formatted')}
                className={`px-2 py-1 text-[11px] transition ${
                  mode === 'formatted'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                }`}
              >
                Formatted
              </button>
              <button
                type="button"
                onClick={() => setMode('json')}
                className={`px-2 py-1 text-[11px] transition ${
                  mode === 'json'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                }`}
              >
                JSON
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === 'formatted' ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {entries.map(([key, value]) => {
                const field = schemaByName.get(key);
                const badge = field ? fieldBadge(field) : valueBadge(value);
                const BadgeIcon = badge.icon;
                const isJsonLike =
                  value !== null && typeof value === 'object' && !(value instanceof Date);
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-white/10 bg-[#16181d] p-3"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <BadgeIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono text-xs text-foreground">{key}</span>
                        <span
                          className={`inline-flex shrink-0 items-center rounded px-1 text-[9px] ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFieldCopy(key, value)}
                        aria-label={`Copy ${key}`}
                        className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                      >
                        {copiedKey === key ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <div className="rounded border border-white/5 bg-black/20 p-2">
                      {isJsonLike ? (
                        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-foreground/90">
                          {formatFull(value)}
                        </pre>
                      ) : (
                        <span className="break-words font-mono text-[11px] text-foreground/90">
                          {formatFull(value)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-[#16181d] p-3 font-mono text-xs text-foreground/90">
              {JSON.stringify(record, null, 2)}
            </pre>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/10 bg-[#14161b] px-5 py-3">
          <div className="text-[11px] text-muted-foreground">
            <span className="tabular-nums">{entries.length}</span> fields
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              {copiedKey === '__all__' ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy JSON
            </button>
            {writable && recordId && (
              <button
                type="button"
                onClick={() => onDelete(recordId)}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              Close
            </button>
          </div>
        </footer>

        {!writable && (
          <div className="absolute left-5 bottom-[72px] inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#14161b]/90 px-2 py-1 text-[10px] text-muted-foreground shadow-lg">
            <Lock className="h-3 w-3" />
            Read-only model — use the dedicated admin page for mutations
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (recordId) void navigator.clipboard?.writeText(recordId);
          }}
          className="hidden"
          aria-hidden="true"
          data-testid="hidden-copy-trigger-reserved"
        />
        <HiddenKeyboardHandler tableName={tableName} />
      </div>
    </div>,
    document.body,
  );
}

function HiddenKeyboardHandler({ tableName }: { tableName: string }) {
  // Keeps rule of hooks clean even if parent portal remounts.
  useEffect(() => {
    void tableName;
  }, [tableName]);
  return null;
}

/* --------------------------- Shortcuts dialog --------------------------- */

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;

  const items: Array<[string, string]> = [
    ['/', 'Focus search'],
    ['j / k', 'Next / previous row'],
    ['r', 'Refresh'],
    ['?', 'Toggle this help'],
    ['Esc', 'Close dialog / picker'],
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#1a1b23] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Keyboard className="h-4 w-4 text-primary" />
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <ul className="divide-y divide-white/5">
          {items.map(([keys, desc]) => (
            <li key={keys} className="flex items-center justify-between px-5 py-2.5">
              <span className="text-sm text-muted-foreground">{desc}</span>
              <kbd className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-foreground">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
