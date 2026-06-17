"use client";
import { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Search,
  User,
  Image as ImageIcon,
  X,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Clock,
  Eye,
  Ban,
  XCircle,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsCard from '@/components/admin/StatsCard';
import BulkActionBar from '@/components/admin/BulkActionBar';
import ExportButton from '@/components/admin/ExportButton';

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

interface ReportRecord {
  id: string;
  reason: string;
  category: string;
  description?: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string | null; email: string | null };
  reported: { id: string; name: string | null; email: string | null };
  attachments: Attachment[];
}

const STATUS_FILTERS = ['all', 'pending', 'resolved', 'rejected'];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState<'overview' | 'files'>('overview');
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [banDialog, setBanDialog] = useState<{ userId: string; userName: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/reports');
        const json = await res.json();
        setReports(json.reports || []);
      } catch (e) {
        console.error('Failed to load reports', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = reports;
    if (categoryFilter !== 'all') result = result.filter((r) => r.category === categoryFilter);
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.reason.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.reporter.name || '').toLowerCase().includes(q) ||
          (r.reported.name || '').toLowerCase().includes(q) ||
          r.id.includes(q),
      );
    }
    return result;
  }, [reports, search, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const allAttachments: Attachment[] = useMemo(() => reports.flatMap((r) => r.attachments || []), [reports]);
  const categories = useMemo(() => ['all', ...Array.from(new Set(reports.map((r) => r.category)))], [reports]);

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === 'pending').length,
      resolved: reports.filter((r) => r.status === 'resolved').length,
      rejected: reports.filter((r) => r.status === 'rejected').length,
      withAttachments: reports.filter((r) => r.attachments?.length > 0).length,
    }),
    [reports],
  );

  const handleStatus = async (reportId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: updated.status } : r)));
        if (selectedReport?.id === reportId) {
          setSelectedReport((prev) => (prev ? { ...prev, status: updated.status } : null));
        }
      }
    } catch (e) {
      console.error('Failed to update status', e);
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
    const pageIds = paginated.map((r) => r.id);
    const allSelected = pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const bulkUpdate = async (status: 'resolved' | 'rejected') => {
    if (selected.size === 0 || bulkBusy) return;
    const ids = Array.from(selected);
    setBulkBusy(true);
    try {
      const res = await fetch('/api/admin/reports/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportIds: ids, status }),
      });
      if (!res.ok) throw new Error('Bulk update failed');
      setReports((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, status } : r)));
      clearSelection();
    } catch (e) {
      console.error('Bulk update failed', e);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-warning/15 text-warning border-warning/30',
      resolved: 'bg-success/15 text-success border-success/30',
      rejected: 'bg-error/15 text-error border-error/30',
    };
    return map[status] || 'bg-white/10 text-muted-foreground border-white/15';
  };

  const categoryBadge = (category: string) => {
    const map: Record<string, string> = {
      harassment: 'bg-error/10 text-error',
      spam: 'bg-warning/10 text-warning',
      inappropriate: 'bg-accent/10 text-accent',
    };
    return map[category] || 'bg-info/10 text-info';
  };

  const exportRows = useMemo(
    () =>
      filtered.map((r) => ({
        id: r.id,
        created_at: r.createdAt,
        status: r.status,
        category: r.category,
        reason: r.reason,
        reporter_id: r.reporter?.id ?? '',
        reporter_name: r.reporter?.name ?? '',
        reporter_email: r.reporter?.email ?? '',
        reported_id: r.reported?.id ?? '',
        reported_name: r.reported?.name ?? '',
        reported_email: r.reported?.email ?? '',
        attachments: r.attachments?.length ?? 0,
      })),
    [filtered],
  );

  // Windowed page numbers (max 7 visible)
  const pageNumbers = useMemo(() => {
    const pages: (number | 'gap')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push('gap');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('gap');
    pages.push(totalPages);
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="p-6">
      <AdminHeader
        title="User Reports"
        description="Review flagged users and submitted evidence."
        icon={Shield}
        iconTone="danger"
        actions={
          <ExportButton filename="user-reports" rows={exportRows} disabled={exportRows.length === 0} />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatsCard title="Total" value={stats.total} icon={Shield} tone="primary" />
        <StatsCard title="Pending" value={stats.pending} icon={Clock} tone="warning" />
        <StatsCard title="Resolved" value={stats.resolved} icon={Check} tone="success" />
        <StatsCard title="Rejected" value={stats.rejected} icon={X} tone="error" />
        <StatsCard title="With files" value={stats.withAttachments} icon={ImageIcon} tone="info" />
      </div>

      <div className="flex gap-1 mb-6 border-b border-white/10">
        <TabButton active={tab === 'overview'} onClick={() => { setTab('overview'); setCurrentPage(1); }}>
          Overview
        </TabButton>
        <TabButton active={tab === 'files'} onClick={() => setTab('files')}>
          Files ({allAttachments.length})
        </TabButton>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search reports, users, reason…"
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground outline-none focus:border-primary/40 transition-all"
        >
          {categories.map((c) => (
            <option key={c} value={c} className="bg-background">
              {c === 'all' ? 'All categories' : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground outline-none focus:border-primary/40 transition-all"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s} className="bg-background">
              {s === 'all' ? 'All status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3" />
          Loading reports…
        </div>
      ) : tab === 'overview' ? (
        <>
          <BulkActionBar
            count={selected.size}
            onClear={clearSelection}
            label={selected.size === 1 ? 'report selected' : 'reports selected'}
            actions={[
              {
                label: 'Resolve',
                icon: Check,
                tone: 'success',
                disabled: bulkBusy,
                onClick: () => bulkUpdate('resolved'),
              },
              {
                label: 'Reject',
                icon: XCircle,
                tone: 'error',
                disabled: bulkBusy,
                onClick: () => bulkUpdate('rejected'),
              },
            ]}
          />
          <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="py-3 pl-4 pr-2 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={paginated.length > 0 && paginated.every((r) => selected.has(r.id))}
                        ref={(el) => {
                          if (el) {
                            const some = paginated.some((r) => selected.has(r.id));
                            const all = paginated.length > 0 && paginated.every((r) => selected.has(r.id));
                            el.indeterminate = some && !all;
                          }
                        }}
                        onChange={togglePage}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-primary cursor-pointer"
                      />
                    </th>
                    <Th>Reporter</Th>
                    <Th>Reported</Th>
                    <Th>Category</Th>
                    <Th>Reason</Th>
                    <Th>Evidence</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b border-white/5 transition-colors ${
                        selected.has(r.id) ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2">
                        <input
                          type="checkbox"
                          aria-label={`Select report ${r.id}`}
                          checked={selected.has(r.id)}
                          onChange={() => toggleRow(r.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <PersonCell name={r.reporter?.name} email={r.reporter?.email} tone="info" />
                      </td>
                      <td className="py-3 px-4">
                        <PersonCell name={r.reported?.name} email={r.reported?.email} tone="error" icon={AlertCircle} />
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${categoryBadge(r.category)}`}>
                          {r.category.charAt(0).toUpperCase() + r.category.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-foreground truncate max-w-[200px]" title={r.reason}>
                          {r.reason}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        {r.attachments?.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-info">
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">{r.attachments.length}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(r.status)}`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <IconBtn label="View" onClick={() => setSelectedReport(r)} tone="neutral">
                            <Eye className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn label="Resolve" onClick={() => handleStatus(r.id, 'resolved')} tone="success">
                            <Check className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn label="Ban user" onClick={() => setBanDialog({ userId: r.reported.id, userName: r.reported?.name || 'User' })} tone="error">
                            <Ban className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {paginated.length === 0 && (
              <div className="py-16 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No reports found</p>
              </div>
            )}
          </div>

          {filtered.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-5 px-1">
              <p className="text-xs text-muted-foreground">
                {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-1">
                <PageBtn onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  Previous
                </PageBtn>
                {pageNumbers.map((p, i) =>
                  p === 'gap' ? (
                    <span key={`gap-${i}`} className="px-2 text-xs text-muted-foreground self-center">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      aria-current={currentPage === p ? 'page' : undefined}
                      className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                        currentPage === p
                          ? 'bg-primary/20 text-foreground border border-primary/40'
                          : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-transparent'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <PageBtn
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </PageBtn>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <Th>File</Th>
                  <Th>Size</Th>
                  <Th>Type</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {allAttachments.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-info" />
                        <p className="text-foreground truncate">{a.fileName}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{formatFileSize(a.fileSize)}</td>
                    <td className="py-3 px-4 text-muted-foreground">{a.fileType}</td>
                    <td className="py-3 px-4">
                      <a
                        href={`/api/admin/reports/attachments/${a.id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-info/15 text-info hover:bg-info/25 transition-colors text-xs font-medium"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {allAttachments.length === 0 && (
            <div className="py-16 text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No attachments found</p>
            </div>
          )}
        </div>
      )}

      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatus={handleStatus}
          onBanRequest={() => setBanDialog({ userId: selectedReport.reported.id, userName: selectedReport.reported?.name || 'User' })}
          onCopy={handleCopy}
          copied={copied}
          formatFileSize={formatFileSize}
          categoryBadge={categoryBadge}
          statusBadge={statusBadge}
        />
      )}

      {banDialog && (
        <BanDialog
          userName={banDialog.userName}
          onCancel={() => setBanDialog(null)}
          onConfirm={async (days, reason) => {
            try {
              await fetch(`/api/admin/users/${banDialog.userId}/ban`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, duration: days }),
              });
            } catch (e) {
              console.error('Failed to ban user', e);
            } finally {
              setBanDialog(null);
            }
          }}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">{children}</th>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-selected={active}
      className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
    </button>
  );
}

function PersonCell({
  name,
  email,
  tone,
  icon: Icon = User,
}: {
  name: string | null | undefined;
  email: string | null | undefined;
  tone: 'info' | 'error';
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const bg = tone === 'info' ? 'bg-info/15' : 'bg-error/15';
  const fg = tone === 'info' ? 'text-info' : 'text-error';
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-4 w-4 ${fg}`} />
      </div>
      <div className="min-w-0">
        <p className="text-foreground font-medium text-xs truncate">{name || 'Unknown'}</p>
        <p className="text-muted-foreground text-xs truncate">{email || 'No email'}</p>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone: 'neutral' | 'success' | 'error';
}) {
  const toneCls = {
    neutral: 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground',
    success: 'bg-success/15 hover:bg-success/25 text-success',
    error: 'bg-error/15 hover:bg-error/25 text-error',
  }[tone];
  return (
    <button onClick={onClick} title={label} aria-label={label} className={`p-1.5 rounded-md transition-colors ${toneCls}`}>
      {children}
    </button>
  );
}

function PageBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 h-8 rounded-md bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
    >
      {children}
    </button>
  );
}

interface ReportModalProps {
  report: ReportRecord;
  onClose: () => void;
  onStatus: (id: string, status: string) => void;
  onBanRequest: () => void;
  onCopy: (text: string, id: string) => void;
  copied: string | null;
  formatFileSize: (bytes: number) => string;
  categoryBadge: (c: string) => string;
  statusBadge: (s: string) => string;
}

function ReportModal({
  report,
  onClose,
  onStatus,
  onBanRequest,
  onCopy,
  copied,
  formatFileSize,
  categoryBadge,
  statusBadge,
}: ReportModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-white/10 bg-background/95 backdrop-blur">
          <h2 className="text-base font-semibold text-foreground">Report details</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/10">
            <div>
              <p className="text-xs text-muted-foreground">Report ID</p>
              <p className="text-foreground font-mono text-xs mt-0.5">{report.id}</p>
            </div>
            <button onClick={() => onCopy(report.id, 'id')} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" aria-label="Copy report id">
              {copied === 'id' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-info/5 border border-info/20">
              <p className="text-info text-xs font-semibold mb-2">Reporter</p>
              <p className="text-foreground text-sm">{report.reporter?.name || 'Unknown'}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{report.reporter?.email}</p>
            </div>
            <div className="p-3 rounded-lg bg-error/5 border border-error/20">
              <p className="text-error text-xs font-semibold mb-2">Reported user</p>
              <p className="text-foreground text-sm">{report.reported?.name || 'Unknown'}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{report.reported?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Category</p>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${categoryBadge(report.category)}`}>
                {report.category.charAt(0).toUpperCase() + report.category.slice(1)}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Status</p>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge(report.status)}`}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Reason</p>
            <p className="text-sm text-foreground bg-white/[0.03] border border-white/10 rounded-lg p-3">{report.reason}</p>
          </div>

          {report.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Additional details</p>
              <p className="text-sm text-foreground bg-white/[0.03] border border-white/10 rounded-lg p-3 whitespace-pre-wrap">{report.description}</p>
            </div>
          )}

          {report.attachments?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold">Attached evidence ({report.attachments.length})</p>
              <div className="space-y-1.5">
                {report.attachments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/10 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ImageIcon className="h-4 w-4 text-info flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-xs truncate">{a.fileName}</p>
                        <p className="text-muted-foreground text-xs">{formatFileSize(a.fileSize)}</p>
                      </div>
                    </div>
                    <a href={`/api/admin/reports/attachments/${a.id}/view`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-white/10 transition-colors" aria-label={`Open ${a.fileName}`}>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-muted-foreground">
            <span>Submitted {new Date(report.createdAt).toLocaleString()}</span>
            <Clock className="h-3.5 w-3.5" />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { onStatus(report.id, 'resolved'); onClose(); }}
              className="flex-1 px-3 py-2 rounded-md bg-success/20 hover:bg-success/30 text-success border border-success/30 font-medium text-sm transition-colors"
            >
              Resolve
            </button>
            <button
              onClick={() => { onStatus(report.id, 'rejected'); onClose(); }}
              className="flex-1 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-foreground border border-white/10 font-medium text-sm transition-colors"
            >
              Reject
            </button>
            <button
              onClick={onBanRequest}
              className="flex-1 px-3 py-2 rounded-md bg-error/20 hover:bg-error/30 text-error border border-error/30 font-medium text-sm transition-colors"
            >
              Ban user
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BanDialog({
  userName,
  onCancel,
  onConfirm,
}: {
  userName: string;
  onCancel: () => void;
  onConfirm: (days: number, reason: string) => void;
}) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('Banned from report');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-background border border-white/10 rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-error/15 border border-error/30">
            <Ban className="h-4 w-4 text-error" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Ban user</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Temporarily suspend {userName}'s account.</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Duration (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted-foreground">1–365 days (max 1 year)</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-white/10">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-foreground border border-white/10 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setSubmitting(true);
              await onConfirm(days, reason.trim() || 'Banned from report');
            }}
            disabled={submitting}
            className="flex-1 px-3 py-2 rounded-md bg-error hover:opacity-90 text-error-foreground text-sm font-medium transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Banning…' : `Ban for ${days}d`}
          </button>
        </div>
      </div>
    </div>
  );
}
