'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileJson,
  Grid2x2,
  HardDrive,
  Hash,
  Keyboard,
  List,
  Loader2,
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
  type AdminFileRecord,
  type FileCategory,
  type FileOrderField,
  type FilePageSize,
  type FileSource,
  FILE_CATEGORIES,
  FILE_ORDER_FIELDS,
  FILE_PAGE_SIZES,
  FILE_SOURCES,
  categorizeFile,
  categoryMeta,
  copyToClipboard,
  formatFileSize,
  isValidFilePageSize,
  relativeTime,
} from '@/lib/filesAdmin';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface StorageInfo {
  bucket: string;
  region: string;
}

interface Stats {
  counts: { total: number; voice: number; channel: number };
  size: { total: number; byCategory: Record<FileCategory, number> };
  storage: StorageInfo;
}

interface DetailResponse {
  record: AdminFileRecord;
  s3: {
    bucket: string;
    region: string;
    key: string;
    publicUrl: string;
    signedUrl: string;
    signedUrlExpiresIn: number;
    metadata: {
      contentLength: number | null;
      contentType: string | null;
      etag: string | null;
      lastModified: string | null;
      storageClass: string | null;
      serverSideEncryption: string | null;
      exists: boolean;
    };
  };
}

type ViewMode = 'grid' | 'list';

const VIEW_KEY = 'admin.files.view.v1';

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}

function useStableCallback<T extends (...a: never[]) => unknown>(cb: T): T {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  }, [cb]);
  return useCallback((...a: Parameters<T>) => ref.current(...a), []) as T;
}

export default function FileManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();

  // URL-synced state
  const q = searchParams.get('q') ?? '';
  const source = (searchParams.get('source') as FileSource | 'all') || 'all';
  const category = (searchParams.get('category') as FileCategory | 'all') || 'all';
  const orderBy = (searchParams.get('orderBy') as FileOrderField) || 'createdAt';
  const orderDir: 'asc' | 'desc' =
    searchParams.get('orderDir') === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limitRaw = parseInt(searchParams.get('limit') || '50', 10);
  const limit: FilePageSize = isValidFilePageSize(limitRaw) ? limitRaw : 50;
  const openFileKey = searchParams.get('file');

  // Local UI state
  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebounced(searchInput, 300);
  const [records, setRecords] = useState<AdminFileRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>('list');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load view preference
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === 'grid' || v === 'list') setView(v);
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // ignore
    }
  }, [view]);

  // Mirror debounced search to URL
  useEffect(() => {
    if (debouncedSearch === q) return;
    const sp = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) sp.set('q', debouncedSearch);
    else sp.delete('q');
    sp.delete('page');
    router.replace(`?${sp.toString()}`, { scroll: false });
  }, [debouncedSearch, q, router, searchParams]);

  const updateParam = useStableCallback(
    (patch: Record<string, string | number | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') sp.delete(k);
        else sp.set(k, String(v));
      }
      router.replace(`?${sp.toString()}`, { scroll: false });
    },
  );

  const fetchFiles = useStableCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q) sp.set('q', q);
      if (source !== 'all') sp.set('source', source);
      if (category !== 'all') sp.set('category', category);
      sp.set('orderBy', orderBy);
      sp.set('orderDir', orderDir);
      sp.set('page', String(page));
      sp.set('limit', String(limit));
      const res = await fetch(`/api/admin/files?${sp.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { records: AdminFileRecord[]; pagination: Pagination };
      setRecords(data.records);
      setPagination(data.pagination);
    } catch (err) {
      toast.push({
        tone: 'error',
        title: 'Failed to load files',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  });

  const fetchStats = useStableCallback(async () => {
    try {
      const res = await fetch('/api/admin/files/stats');
      if (!res.ok) return;
      setStats((await res.json()) as Stats);
    } catch {
      // silent — stats are non-critical
    }
  });

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles, q, source, category, orderBy, orderDir, page, limit]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // Reset selection on filter change
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [q, source, category, orderBy, orderDir, page, limit]);

  // Fetch detail when ?file=<source>:<id>
  useEffect(() => {
    if (!openFileKey) {
      setDetail(null);
      return;
    }
    const [src, id] = openFileKey.split(':');
    if ((src !== 'voice' && src !== 'channel') || !id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/files/${src}/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setDetail((await res.json()) as DetailResponse);
      } catch (err) {
        toast.push({
          tone: 'error',
          title: 'Failed to load file details',
          description: err instanceof Error ? err.message : 'Unknown error',
        });
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [openFileKey, toast]);

  const openFile = useStableCallback((r: AdminFileRecord) => {
    updateParam({ file: `${r.source}:${r.id}` });
  });
  const closeFile = useStableCallback(() => updateParam({ file: null }));

  const toggleSelect = useStableCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  });
  const selectAllVisible = useStableCallback(() => {
    setSelectedKeys(new Set(records.map((r) => `${r.source}:${r.id}`)));
  });
  const clearSelection = useStableCallback(() => setSelectedKeys(new Set()));

  const handleCopy = useStableCallback(async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    toast.push({
      tone: ok ? 'success' : 'error',
      title: ok ? `Copied ${label}` : 'Copy failed',
      duration: 2000,
    });
  });

  const handleDelete = useStableCallback(async (keys: string[]) => {
    const targets = keys
      .map((k) => {
        const [src, id] = k.split(':');
        if (src === 'voice' || src === 'channel') return { source: src, id: id! };
        return null;
      })
      .filter((t): t is { source: FileSource; id: string } => t !== null);
    if (targets.length === 0) return;

    const ok = await toast.confirm({
      title: `Delete ${targets.length} file${targets.length === 1 ? '' : 's'}?`,
      description:
        'This permanently removes the file from S3 and the database. Cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch('/api/admin/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets }),
      });
      const data = (await res.json()) as { deleted: number; failed: number; message?: string };
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      toast.push({
        tone: data.failed === 0 ? 'success' : 'warning',
        title: data.message || 'Deleted',
      });
      if (keys.includes(openFileKey ?? '')) closeFile();
      clearSelection();
      void fetchFiles();
      void fetchStats();
    } catch (err) {
      toast.push({
        tone: 'error',
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  const handleExportCSV = useStableCallback(() => {
    const source =
      selectedKeys.size > 0
        ? records.filter((r) => selectedKeys.has(`${r.source}:${r.id}`))
        : records;
    if (source.length === 0) {
      toast.push({ tone: 'warning', title: 'No files to export', duration: 2000 });
      return;
    }
    downloadCSV(
      `files-${new Date().toISOString().slice(0, 10)}.csv`,
      source.map((r) => ({
        id: r.id,
        source: r.source,
        fileName: r.fileName,
        fileType: r.fileType,
        fileSize: r.fileSize,
        s3Key: r.s3Key,
        channel: r.channel?.name ?? '',
        groupNumber: r.groupNumber ?? '',
        uploaderName: r.uploader?.name ?? r.uploader?.username ?? '',
        uploaderEmail: r.uploader?.email ?? '',
        createdAt: r.createdAt,
      })),
    );
    toast.push({
      tone: 'success',
      title: `Exported ${source.length} row${source.length === 1 ? '' : 's'}`,
      duration: 2000,
    });
  });

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (detail) {
          closeFile();
          e.preventDefault();
        } else if (shortcutsOpen) {
          setShortcutsOpen(false);
          e.preventDefault();
        }
        return;
      }
      if (editing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'r') {
        e.preventDefault();
        void fetchFiles();
        void fetchStats();
      } else if (e.key === 'g') {
        e.preventDefault();
        setView('grid');
      } else if (e.key === 'l') {
        e.preventDefault();
        setView('list');
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeFile, detail, fetchFiles, fetchStats, shortcutsOpen]);

  const stat = useMemo(() => {
    if (!stats) return null;
    return {
      total: stats.counts.total,
      voice: stats.counts.voice,
      channel: stats.counts.channel,
      bytes: stats.size.total,
      bucket: stats.storage.bucket,
      region: stats.storage.region,
    };
  }, [stats]);

  const headerMeta = stat ? (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Hash className="h-3.5 w-3.5" />
        <strong className="font-semibold text-foreground">{stat.total.toLocaleString()}</strong>{' '}
        files
      </span>
      <span className="inline-flex items-center gap-1.5">
        <HardDrive className="h-3.5 w-3.5" />
        <strong className="font-semibold text-foreground">{formatFileSize(stat.bytes)}</strong>{' '}
        stored
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-[11px] text-foreground">{stat.bucket}</span>
        <span className="text-[10px] uppercase tracking-wider">{stat.region}</span>
      </span>
    </div>
  ) : (
    <div className="text-xs text-muted-foreground">Loading statistics…</div>
  );

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#0f1014] p-6 text-foreground">
      <AdminHeader
        title="Files"
        description="Every file stored in S3, with bucket metadata and signed downloads."
        icon={HardDrive}
        iconTone="primary"
        meta={headerMeta}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void fetchFiles();
                void fetchStats();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:bg-white/10"
              title="Refresh (r)"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:bg-white/10"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-3.5 w-3.5" />
              Shortcuts
            </button>
          </div>
        }
      />

      <FilterBar
        searchRef={searchRef}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        source={source}
        category={category}
        onSource={(v) => updateParam({ source: v === 'all' ? null : v, page: null })}
        onCategory={(v) => updateParam({ category: v === 'all' ? null : v, page: null })}
        orderBy={orderBy}
        orderDir={orderDir}
        onOrder={(field) => {
          const dir =
            orderBy === field ? (orderDir === 'asc' ? 'desc' : 'asc') : 'desc';
          updateParam({ orderBy: field, orderDir: dir });
        }}
        limit={limit}
        onLimit={(n) => updateParam({ limit: n, page: null })}
        view={view}
        setView={setView}
        onExport={handleExportCSV}
        loading={loading}
      />

      {selectedKeys.size > 0 && (
        <BulkActionBar
          count={selectedKeys.size}
          onClear={clearSelection}
          actions={[
            {
              label: 'Export selected',
              icon: FileJson,
              tone: 'neutral',
              onClick: handleExportCSV,
            },
            {
              label: 'Delete selected',
              icon: Trash2,
              tone: 'error',
              onClick: () => handleDelete(Array.from(selectedKeys)),
            },
          ]}
        />
      )}

      {loading && records.length === 0 ? (
        <EmptyState icon={Loader2} iconClass="animate-spin" title="Loading files…" />
      ) : records.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="No files match these filters"
          description={
            q || source !== 'all' || category !== 'all'
              ? 'Try clearing filters or adjusting the search.'
              : 'No files have been uploaded yet.'
          }
        />
      ) : view === 'list' ? (
        <ListView
          records={records}
          selectedKeys={selectedKeys}
          onToggle={toggleSelect}
          onSelectAll={selectAllVisible}
          onClearAll={clearSelection}
          onOpen={openFile}
          onDelete={(r) => handleDelete([`${r.source}:${r.id}`])}
          orderBy={orderBy}
          orderDir={orderDir}
          onSort={(field) => {
            const dir = orderBy === field ? (orderDir === 'asc' ? 'desc' : 'asc') : 'desc';
            updateParam({ orderBy: field, orderDir: dir });
          }}
        />
      ) : (
        <GridView
          records={records}
          selectedKeys={selectedKeys}
          onToggle={toggleSelect}
          onOpen={openFile}
          onDelete={(r) => handleDelete([`${r.source}:${r.id}`])}
        />
      )}

      <Pagination
        pagination={pagination}
        onPage={(p) => updateParam({ page: p > 1 ? p : null })}
      />

      {openFileKey && (
        <FileDetailModal
          loading={detailLoading}
          detail={detail}
          onClose={closeFile}
          onDelete={(r) => handleDelete([`${r.source}:${r.id}`])}
          onCopy={handleCopy}
        />
      )}

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}

// ============================================================================
// FilterBar
// ============================================================================

interface FilterBarProps {
  searchRef: React.RefObject<HTMLInputElement>;
  searchInput: string;
  setSearchInput: (v: string) => void;
  source: FileSource | 'all';
  category: FileCategory | 'all';
  onSource: (v: FileSource | 'all') => void;
  onCategory: (v: FileCategory | 'all') => void;
  orderBy: FileOrderField;
  orderDir: 'asc' | 'desc';
  onOrder: (field: FileOrderField) => void;
  limit: FilePageSize;
  onLimit: (n: FilePageSize) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  onExport: () => void;
  loading: boolean;
}

function FilterBar({
  searchRef,
  searchInput,
  setSearchInput,
  source,
  category,
  onSource,
  onCategory,
  orderBy,
  orderDir,
  onOrder,
  limit,
  onLimit,
  view,
  setView,
  onExport,
  loading,
}: FilterBarProps) {
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-[#16181d] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search files, uploader, channel… ( / )"
            className="h-9 w-full rounded-md border border-white/10 bg-[#1a1b23] pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <select
          value={orderBy}
          onChange={(e) => onOrder(e.target.value as FileOrderField)}
          className="h-9 rounded-md border border-white/10 bg-[#1a1b23] px-2 text-xs text-foreground focus:border-primary/40 focus:outline-none"
          aria-label="Sort by"
        >
          {FILE_ORDER_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              Sort: {f.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onOrder(orderBy)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-[#1a1b23] text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          title={orderDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          {orderDir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )}
        </button>

        <select
          value={limit}
          onChange={(e) => onLimit(parseInt(e.target.value, 10) as FilePageSize)}
          className="h-9 rounded-md border border-white/10 bg-[#1a1b23] px-2 text-xs text-foreground focus:border-primary/40 focus:outline-none"
          aria-label="Page size"
        >
          {FILE_PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-md border border-white/10 bg-[#1a1b23] p-0.5">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`inline-flex h-8 items-center gap-1 rounded px-2 text-xs transition ${
              view === 'list'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="List view (l)"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`inline-flex h-8 items-center gap-1 rounded px-2 text-xs transition ${
              view === 'grid'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Grid view (g)"
          >
            <Grid2x2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-[#1a1b23] px-2.5 text-xs text-foreground transition hover:bg-white/10"
          title="Export current page (CSV)"
        >
          <FileJson className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <ChipRow
          value={source}
          options={FILE_SOURCES}
          onSelect={(v) => onSource(v as FileSource | 'all')}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <ChipRow
          value={category}
          options={FILE_CATEGORIES}
          onSelect={(v) => onCategory(v as FileCategory | 'all')}
        />
      </div>
    </div>
  );
}

function ChipRow<T extends string>({
  value,
  options,
  onSelect,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onSelect: (v: T) => void;
}) {
  return (
    <>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-medium transition ${
            value === opt.value
              ? 'bg-primary/15 text-primary'
              : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </>
  );
}

// ============================================================================
// ListView
// ============================================================================

function keyOf(r: AdminFileRecord): string {
  return `${r.source}:${r.id}`;
}

function ListView({
  records,
  selectedKeys,
  onToggle,
  onSelectAll,
  onClearAll,
  onOpen,
  onDelete,
  orderBy,
  orderDir,
  onSort,
}: {
  records: AdminFileRecord[];
  selectedKeys: Set<string>;
  onToggle: (k: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onOpen: (r: AdminFileRecord) => void;
  onDelete: (r: AdminFileRecord) => void;
  orderBy: FileOrderField;
  orderDir: 'asc' | 'desc';
  onSort: (f: FileOrderField) => void;
}) {
  const allSelected = records.length > 0 && records.every((r) => selectedKeys.has(keyOf(r)));
  const someSelected = !allSelected && records.some((r) => selectedKeys.has(keyOf(r)));

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#16181d]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#14161b] text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  aria-label={allSelected ? 'Clear selection' : 'Select all on page'}
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={() => (allSelected ? onClearAll() : onSelectAll())}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-[#1a1b23] accent-primary"
                />
              </th>
              <SortTh
                label="Name"
                field="fileName"
                orderBy={orderBy}
                orderDir={orderDir}
                onSort={onSort}
              />
              <SortTh
                label="Type"
                field="fileType"
                orderBy={orderBy}
                orderDir={orderDir}
                onSort={onSort}
              />
              <SortTh
                label="Size"
                field="fileSize"
                orderBy={orderBy}
                orderDir={orderDir}
                onSort={onSort}
                align="right"
              />
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Channel</th>
              <th className="px-3 py-2 text-left font-medium">Uploader</th>
              <SortTh
                label="Uploaded"
                field="createdAt"
                orderBy={orderBy}
                orderDir={orderDir}
                onSort={onSort}
              />
              <th className="w-28 px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const key = keyOf(r);
              const selected = selectedKeys.has(key);
              const cat = categorizeFile(r.fileType, r.fileName);
              const meta = categoryMeta(cat);
              const Icon = meta.icon;
              return (
                <tr
                  key={key}
                  className={`border-t border-white/5 transition ${
                    selected ? 'bg-primary/5' : 'hover:bg-white/5'
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggle(key)}
                      aria-label={`Select ${r.fileName}`}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-[#1a1b23] accent-primary"
                    />
                  </td>
                  <td className="max-w-[320px] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onOpen(r)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded ${meta.className}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate font-medium text-foreground">{r.fileName}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      {r.fileType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatFileSize(r.fileSize)}</td>
                  <td className="px-3 py-2">
                    <SourceChip source={r.source} />
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-muted-foreground">
                    {r.channel?.name ?? (
                      <span className="text-muted-foreground/70">—</span>
                    )}
                    {r.groupNumber != null && (
                      <span className="ml-1 text-[10px] text-muted-foreground/70">
                        · grp {r.groupNumber}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                    {r.uploader?.name || r.uploader?.username || (
                      <span className="text-muted-foreground/70">Unknown</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground" title={r.createdAt}>
                    {relativeTime(r.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpen(r)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                        title="Inspect"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(r)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-red-300/80 transition hover:bg-red-500/15 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortTh({
  label,
  field,
  orderBy,
  orderDir,
  onSort,
  align = 'left',
}: {
  label: string;
  field: FileOrderField;
  orderBy: FileOrderField;
  orderDir: 'asc' | 'desc';
  onSort: (f: FileOrderField) => void;
  align?: 'left' | 'right';
}) {
  const active = orderBy === field;
  return (
    <th
      className={`px-3 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}
      aria-sort={active ? (orderDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 transition hover:text-foreground ${
          active ? 'text-foreground' : ''
        }`}
      >
        {label}
        {active &&
          (orderDir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );
}

function SourceChip({ source }: { source: FileSource }) {
  return source === 'voice' ? (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-sky-500/10 text-sky-300">
      Voice
    </span>
  ) : (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-300">
      Channel
    </span>
  );
}

// ============================================================================
// GridView
// ============================================================================

function GridView({
  records,
  selectedKeys,
  onToggle,
  onOpen,
  onDelete,
}: {
  records: AdminFileRecord[];
  selectedKeys: Set<string>;
  onToggle: (k: string) => void;
  onOpen: (r: AdminFileRecord) => void;
  onDelete: (r: AdminFileRecord) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
      {records.map((r) => {
        const key = keyOf(r);
        const selected = selectedKeys.has(key);
        const cat = categorizeFile(r.fileType, r.fileName);
        const meta = categoryMeta(cat);
        const Icon = meta.icon;
        return (
          <div
            key={key}
            className={`group relative overflow-hidden rounded-xl border transition ${
              selected
                ? 'border-primary/50 bg-primary/5'
                : 'border-white/10 bg-[#16181d] hover:border-white/20 hover:bg-[#1a1b23]'
            }`}
          >
            <button
              type="button"
              onClick={() => onOpen(r)}
              className={`flex aspect-video w-full items-center justify-center ${meta.className}`}
            >
              <Icon className="h-8 w-8" />
            </button>
            <div className="flex items-start justify-between gap-2 p-2.5">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onOpen(r)}
                  className="block w-full truncate text-left text-xs font-medium text-foreground"
                  title={r.fileName}
                >
                  {r.fileName}
                </button>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="tabular-nums">{formatFileSize(r.fileSize)}</span>
                  <span>·</span>
                  <SourceChip source={r.source} />
                </div>
              </div>
              <input
                type="checkbox"
                aria-label={`Select ${r.fileName}`}
                checked={selected}
                onChange={() => onToggle(key)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-[#1a1b23] accent-primary"
              />
            </div>
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onOpen(r)}
                className="inline-flex h-6 w-6 items-center justify-center rounded bg-black/60 text-foreground transition hover:bg-black/80"
                title="Inspect"
              >
                <Eye className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(r)}
                className="inline-flex h-6 w-6 items-center justify-center rounded bg-black/60 text-red-300 transition hover:bg-red-500/30"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Pagination
// ============================================================================

function Pagination({
  pagination,
  onPage,
}: {
  pagination: Pagination;
  onPage: (p: number) => void;
}) {
  if (pagination.total === 0) return null;
  const { page, pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#16181d] px-3 py-2 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {from.toLocaleString()}–{to.toLocaleString()} of{' '}
        <strong className="font-semibold text-foreground">{total.toLocaleString()}</strong>
      </span>
      <div className="inline-flex items-center gap-1">
        <PageBtn disabled={page <= 1} onClick={() => onPage(1)} icon={ChevronsLeft} title="First" />
        <PageBtn
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          icon={ChevronLeft}
          title="Previous"
        />
        <span className="px-2 text-foreground">
          Page{' '}
          <input
            type="number"
            min={1}
            max={pages}
            value={page}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (Number.isFinite(n) && n >= 1 && n <= pages) onPage(n);
            }}
            className="mx-1 w-10 rounded border border-white/10 bg-[#1a1b23] px-1 py-0.5 text-center text-foreground focus:border-primary/40 focus:outline-none"
          />{' '}
          of {pages.toLocaleString()}
        </span>
        <PageBtn
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          icon={ChevronRight}
          title="Next"
        />
        <PageBtn
          disabled={page >= pages}
          onClick={() => onPage(pages)}
          icon={ChevronsRight}
          title="Last"
        />
      </div>
    </div>
  );
}

function PageBtn({
  disabled,
  onClick,
  icon: Icon,
  title,
}: {
  disabled: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#1a1b23] text-muted-foreground transition hover:bg-white/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1a1b23]"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ============================================================================
// EmptyState
// ============================================================================

function EmptyState({
  icon: Icon,
  iconClass = '',
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#16181d] p-12 text-center">
      <Icon className={`h-8 w-8 text-muted-foreground ${iconClass}`} />
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
    </div>
  );
}

// ============================================================================
// FileDetailModal
// ============================================================================

function FileDetailModal({
  loading,
  detail,
  onClose,
  onDelete,
  onCopy,
}: {
  loading: boolean;
  detail: DetailResponse | null;
  onClose: () => void;
  onDelete: (r: AdminFileRecord) => void;
  onCopy: (text: string, label: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;

  const body = loading ? (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  ) : detail ? (
    <DetailContent detail={detail} onCopy={onCopy} onDelete={onDelete} onClose={onClose} />
  ) : (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Failed to load file.
    </div>
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#16181d] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>,
    document.body,
  );
}

function DetailContent({
  detail,
  onCopy,
  onDelete,
  onClose,
}: {
  detail: DetailResponse;
  onCopy: (text: string, label: string) => void;
  onDelete: (r: AdminFileRecord) => void;
  onClose: () => void;
}) {
  const { record, s3 } = detail;
  const cat = categorizeFile(record.fileType, record.fileName);
  const meta = categoryMeta(cat);
  const Icon = meta.icon;

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-[#14161b] px-5 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.className}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground" title={record.fileName}>
              {record.fileName}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <span>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] ${meta.className}`}
                >
                  {meta.label}
                </span>
              </span>
              <span className="font-mono text-[10px]">{record.fileType}</span>
              <span className="tabular-nums">{formatFileSize(record.fileSize)}</span>
              <SourceChip source={record.source} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
          <Preview record={record} signedUrl={s3.signedUrl} />
          <MetaGrid record={record} onCopy={onCopy} />
        </div>

        <aside className="flex w-[320px] shrink-0 flex-col gap-3 overflow-y-auto">
          <S3Panel s3={s3} onCopy={onCopy} />
          <UploaderPanel record={record} />
        </aside>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-[#14161b] px-5 py-3">
        <div className="text-[11px] text-muted-foreground">
          Signed URL expires in {Math.round(s3.signedUrlExpiresIn / 60)} min
        </div>
        <div className="flex items-center gap-2">
          <a
            href={s3.signedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground transition hover:bg-white/10"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </a>
          <a
            href={s3.signedUrl}
            download={record.fileName}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/25"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
          <button
            type="button"
            onClick={() => onDelete(record)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

function Preview({ record, signedUrl }: { record: AdminFileRecord; signedUrl: string }) {
  const cat = categorizeFile(record.fileType, record.fileName);
  if (cat === 'image') {
    return (
      <div className="flex max-h-[420px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
        <img
          src={signedUrl}
          alt={record.fileName}
          className="max-h-[420px] object-contain"
          loading="lazy"
        />
      </div>
    );
  }
  if (cat === 'video') {
    return (
      <video
        controls
        src={signedUrl}
        className="max-h-[420px] w-full rounded-lg border border-white/10 bg-black"
      />
    );
  }
  if (cat === 'audio') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#14161b] p-3">
        <audio controls src={signedUrl} className="w-full" />
      </div>
    );
  }
  if (record.fileType === 'application/pdf') {
    return (
      <iframe
        src={signedUrl}
        title={record.fileName}
        className="h-[420px] w-full rounded-lg border border-white/10 bg-white"
      />
    );
  }
  const { icon: Icon, label, className } = categoryMeta(cat);
  return (
    <div
      className={`flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-white/10 ${className}`}
    >
      <Icon className="h-10 w-10" />
      <div className="text-xs font-medium">No inline preview for {label.toLowerCase()}</div>
    </div>
  );
}

function MetaGrid({
  record,
  onCopy,
}: {
  record: AdminFileRecord;
  onCopy: (text: string, label: string) => void;
}) {
  const rows: Array<{ label: string; value: string; copyLabel?: string }> = [
    { label: 'File name', value: record.fileName, copyLabel: 'file name' },
    { label: 'MIME type', value: record.fileType },
    { label: 'Size', value: `${formatFileSize(record.fileSize)} (${record.fileSize.toLocaleString()} B)` },
    { label: 'Record ID', value: record.id, copyLabel: 'ID' },
    { label: 'Uploaded', value: new Date(record.createdAt).toLocaleString() },
    {
      label: 'Channel',
      value:
        record.channel?.name ??
        (record.source === 'voice' ? '(voice group)' : '—'),
    },
    ...(record.groupNumber != null
      ? [{ label: 'Voice group', value: `Group ${record.groupNumber}` }]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-[#14161b] p-3"
        >
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {row.label}
            </div>
            <div className="mt-0.5 break-words text-xs text-foreground">{row.value}</div>
          </div>
          {row.copyLabel && (
            <button
              type="button"
              onClick={() => onCopy(row.value, row.copyLabel!)}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              title={`Copy ${row.copyLabel}`}
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function S3Panel({
  s3,
  onCopy,
}: {
  s3: DetailResponse['s3'];
  onCopy: (text: string, label: string) => void;
}) {
  const meta = s3.metadata;
  return (
    <div className="rounded-lg border border-white/10 bg-[#14161b] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <HardDrive className="h-3 w-3" />
          S3 object
        </div>
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium ${
            meta.exists
              ? 'bg-emerald-500/10 text-emerald-300'
              : 'bg-red-500/10 text-red-300'
          }`}
        >
          {meta.exists ? 'Present' : 'Missing'}
        </span>
      </div>

      <dl className="mt-3 space-y-2 text-xs">
        <S3Row label="Bucket" value={s3.bucket} onCopy={onCopy} />
        <S3Row label="Region" value={s3.region} />
        <S3Row label="Key" value={s3.key} mono onCopy={onCopy} />
        {meta.etag && <S3Row label="ETag" value={meta.etag} mono onCopy={onCopy} />}
        {meta.storageClass && <S3Row label="Storage class" value={meta.storageClass} />}
        {meta.serverSideEncryption && (
          <S3Row label="Encryption" value={meta.serverSideEncryption} />
        )}
        {meta.lastModified && (
          <S3Row label="Last modified" value={new Date(meta.lastModified).toLocaleString()} />
        )}
        {meta.contentLength != null && (
          <S3Row
            label="S3 content-length"
            value={`${formatFileSize(meta.contentLength)} (${meta.contentLength.toLocaleString()} B)`}
          />
        )}
      </dl>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onCopy(s3.signedUrl, 'signed URL')}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-foreground transition hover:bg-white/10"
        >
          <Copy className="h-3 w-3" />
          Copy signed URL
        </button>
        <button
          type="button"
          onClick={() => onCopy(s3.publicUrl, 'public URL')}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-foreground transition hover:bg-white/10"
        >
          <Copy className="h-3 w-3" />
          Copy public URL
        </button>
      </div>
    </div>
  );
}

function S3Row({
  label,
  value,
  mono = false,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: (text: string, label: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="flex min-w-0 items-start gap-1">
        <span
          className={`min-w-0 break-all text-right ${mono ? 'font-mono text-[10px]' : 'text-xs'} text-foreground`}
        >
          {value}
        </span>
        {onCopy && (
          <button
            type="button"
            onClick={() => onCopy(value, label.toLowerCase())}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            title={`Copy ${label}`}
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
        )}
      </dd>
    </div>
  );
}

function UploaderPanel({ record }: { record: AdminFileRecord }) {
  const u = record.uploader;
  if (!u) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#14161b] p-3 text-xs text-muted-foreground">
        No uploader info available
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-white/10 bg-[#14161b] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Shield className="h-3 w-3" />
        Uploaded by
      </div>
      <div className="mt-2 flex items-center gap-3">
        {u.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={u.image}
            alt={u.name ?? u.username ?? 'user'}
            className="h-10 w-10 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-foreground">
            {(u.name || u.username || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 text-xs">
          <div className="truncate font-medium text-foreground">
            {u.name || u.username || 'Unknown'}
          </div>
          {u.email && <div className="truncate text-muted-foreground">{u.email}</div>}
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">{u.id}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ShortcutsDialog
// ============================================================================

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;

  const shortcuts: Array<[string, string]> = [
    ['/', 'Focus search'],
    ['g', 'Grid view'],
    ['l', 'List view'],
    ['r', 'Refresh data'],
    ['?', 'Show this help'],
    ['Esc', 'Close modal / dismiss'],
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#16181d] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#14161b] px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Keyboard className="h-4 w-4" />
            Keyboard shortcuts
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="p-5 text-sm">
          {shortcuts.map(([k, desc]) => (
            <li
              key={k}
              className="flex items-center justify-between border-b border-white/5 py-2 last:border-b-0"
            >
              <span className="text-muted-foreground">{desc}</span>
              <kbd className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-foreground">
                {k}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
