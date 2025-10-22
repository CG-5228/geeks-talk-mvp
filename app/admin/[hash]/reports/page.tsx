"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Search, Filter, FileText, User, Calendar, Image as ImageIcon, X, Copy, Check, ExternalLink, AlertCircle, TrendingUp, Clock, Eye, Ban } from 'lucide-react';

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Url: string;
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

export default function AdminReportsPage() {
  const params = useParams();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState<'overview' | 'files'>('overview');
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
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
  }, [params]);

  const filtered = useMemo(() => {
    let result = reports;
    
    if (categoryFilter !== 'all') {
      result = result.filter(r => r.category === categoryFilter);
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(r =>
        r.reason.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.reporter.name || '').toLowerCase().includes(q) ||
        (r.reported.name || '').toLowerCase().includes(q) ||
        r.id.includes(q)
      );
    }
    
    return result;
  }, [reports, search, categoryFilter, statusFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const allAttachments: Attachment[] = useMemo(() => {
    return reports.flatMap(r => r.attachments || []);
  }, [reports]);

  const categories = ['all', ...Array.from(new Set(reports.map(r => r.category)))];
  const statuses = ['all', 'pending', 'resolved', 'rejected'];

  const handleStatus = async (reportId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status })
      });
      if (res.ok) {
        const updated = await res.json();
        setReports(prev => prev.map(r => (r.id === reportId ? { ...r, status: updated.status } : r)));
        if (selectedReport?.id === reportId) {
          setSelectedReport(prev => prev ? { ...prev, status: updated.status } : null);
        }
      }
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const handleBan = async (userId: string, reportedName: string) => {
    const duration = prompt('Ban duration in hours (default 24):', '24');
    if (!duration) return;
    
    try {
      await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Banned from report', duration: parseInt(duration) })
      });
      alert(`User ${reportedName} has been banned for ${duration} hours`);
    } catch (e) {
      console.error('Failed to ban user', e);
      alert('Failed to ban user');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const stats = useMemo(() => ({
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
    withAttachments: reports.filter(r => r.attachments?.length > 0).length
  }), [reports]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'harassment': return 'bg-red-500/10 text-red-400';
      case 'spam': return 'bg-orange-500/10 text-orange-400';
      case 'inappropriate': return 'bg-purple-500/10 text-purple-400';
      default: return 'bg-blue-500/10 text-blue-400';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <Shield className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">User Reports</h1>
            <p className="text-white/60 text-sm mt-1">Manage user-submitted reports and evidence</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Reports</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <Shield className="h-5 w-5 text-white/20" />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400/70 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</p>
              </div>
              <Clock className="h-5 w-5 text-yellow-400/20" />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400/70 text-sm">Resolved</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.resolved}</p>
              </div>
              <Check className="h-5 w-5 text-emerald-400/20" />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 hover:border-red-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400/70 text-sm">Rejected</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.rejected}</p>
              </div>
              <X className="h-5 w-5 text-red-400/20" />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400/70 text-sm">With Files</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{stats.withAttachments}</p>
              </div>
              <ImageIcon className="h-5 w-5 text-blue-400/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10">
        <button 
          onClick={() => { setTab('overview'); setCurrentPage(1); }} 
          className={`px-4 py-2 font-medium transition-colors relative ${tab==='overview' ? 'text-white' : 'text-white/60 hover:text-white'}`}
        >
          Overview
          {tab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500" />}
        </button>
        <button 
          onClick={() => setTab('files')} 
          className={`px-4 py-2 font-medium transition-colors relative ${tab==='files' ? 'text-white' : 'text-white/60 hover:text-white'}`}
        >
          File Management ({allAttachments.length})
          {tab === 'files' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500" />}
        </button>
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <input 
              value={search} 
              onChange={(e)=>setSearch(e.target.value)} 
              placeholder="Search reports, users, reason..." 
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 outline-none focus:border-white/30 focus:bg-white/10 transition-all" 
            />
          </div>
          <select 
            value={categoryFilter} 
            onChange={(e)=>{ setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white outline-none focus:border-white/30 transition-all"
          >
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select 
            value={statusFilter} 
            onChange={(e)=>{ setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white outline-none focus:border-white/30 transition-all"
          >
            {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50 mx-auto mb-3"></div>
            <p className="text-white/60">Loading reports...</p>
          </div>
        </div>
      ) : tab === 'overview' ? (
        <>
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Reporter</th>
                    <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Reported User</th>
                    <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Category</th>
                    <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Reason</th>
                    <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Evidence</th>
                    <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Status</th>
                    <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Date</th>
                    <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, idx) => (
                    <tr key={r.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-white/2' : ''}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{r.reporter?.name || 'Unknown'}</p>
                            <p className="text-white/50 text-xs">{r.reporter?.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{r.reported?.name || 'Unknown'}</p>
                            <p className="text-white/50 text-xs">{r.reported?.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(r.category)}`}>
                          {r.category.charAt(0).toUpperCase() + r.category.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-white text-sm truncate max-w-[150px]" title={r.reason}>{r.reason}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {r.attachments?.length > 0 ? (
                            <>
                              <ImageIcon className="h-4 w-4 text-blue-400" />
                              <span className="text-white/70 text-sm font-medium">{r.attachments.length}</span>
                            </>
                          ) : (
                            <span className="text-white/40 text-sm">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(r.status)}`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-white/60 text-sm">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={()=>setSelectedReport(r)} className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors" title="View Details">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={()=>handleStatus(r.id,'resolved')} className="p-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors" title="Resolve">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={()=>handleBan(r.reported.id, r.reported?.name || 'User')} className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors" title="Ban User">
                            <Ban className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {paginated.length === 0 && (
              <div className="py-12 text-center">
                <AlertCircle className="h-8 w-8 text-white/30 mx-auto mb-2" />
                <p className="text-white/60">No reports found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-6 px-4">
              <p className="text-white/60 text-sm">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}</p>
              <div className="flex gap-2">
                <button 
                  onClick={()=>setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors text-sm"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({length: Math.ceil(filtered.length / itemsPerPage)}).map((_, i) => (
                    <button 
                      key={i+1}
                      onClick={()=>setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={()=>setCurrentPage(p => Math.min(Math.ceil(filtered.length / itemsPerPage), p + 1))} 
                  disabled={currentPage === Math.ceil(filtered.length / itemsPerPage)}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">File</th>
                  <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Size</th>
                  <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Type</th>
                  <th className="text-left py-4 px-4 text-white/70 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allAttachments.map((a, idx) => (
                  <tr key={a.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-white/2' : ''}`}>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-blue-400" />
                        <p className="text-white font-medium text-sm truncate">{a.fileName}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-white/70 text-sm">{formatFileSize(a.fileSize)}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-white/60 text-sm">{a.fileType}</p>
                    </td>
                    <td className="py-4 px-4">
                      <a href={a.s3Url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {allAttachments.length === 0 && (
            <div className="py-12 text-center">
              <ImageIcon className="h-8 w-8 text-white/30 mx-auto mb-2" />
              <p className="text-white/60">No attachments found</p>
            </div>
          )}
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1b23] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-[#1a1b23]">
              <h2 className="text-lg font-semibold text-white">Report Details</h2>
              <button onClick={()=>setSelectedReport(null)} className="p-1 rounded hover:bg-white/10 transition-colors">
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Report ID */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-white/60 text-sm">Report ID</p>
                  <p className="text-white font-mono text-sm mt-1">{selectedReport.id}</p>
                </div>
                <button onClick={()=>handleCopy(selectedReport.id, 'id')} className="p-2 rounded hover:bg-white/10 transition-colors">
                  {copied === 'id' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-white/50" />}
                </button>
              </div>

              {/* Reporter */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-400 text-sm font-semibold mb-3">Reporter</p>
                <div className="space-y-2">
                  <p className="text-white">{selectedReport.reporter?.name || 'Unknown'}</p>
                  <p className="text-white/60 text-sm">{selectedReport.reporter?.email}</p>
                </div>
              </div>

              {/* Reported User */}
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm font-semibold mb-3">Reported User</p>
                <div className="space-y-2">
                  <p className="text-white">{selectedReport.reported?.name || 'Unknown'}</p>
                  <p className="text-white/60 text-sm">{selectedReport.reported?.email}</p>
                </div>
              </div>

              {/* Category & Reason */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-2">Category</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(selectedReport.category)}`}>
                    {selectedReport.category.charAt(0).toUpperCase() + selectedReport.category.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-2">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-white/60 text-sm mb-2">Reason</p>
                <p className="text-white bg-white/5 border border-white/10 rounded-lg p-3">{selectedReport.reason}</p>
              </div>

              {/* Description */}
              {selectedReport.description && (
                <div>
                  <p className="text-white/60 text-sm mb-2">Additional Details</p>
                  <p className="text-white bg-white/5 border border-white/10 rounded-lg p-3">{selectedReport.description}</p>
                </div>
              )}

              {/* Attachments */}
              {selectedReport.attachments?.length > 0 && (
                <div>
                  <p className="text-white/60 text-sm mb-3 font-semibold">Attached Evidence ({selectedReport.attachments.length})</p>
                  <div className="space-y-2">
                    {selectedReport.attachments.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                        <div className="flex items-center gap-2 flex-1">
                          <ImageIcon className="h-4 w-4 text-blue-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{a.fileName}</p>
                            <p className="text-white/50 text-xs">{formatFileSize(a.fileSize)}</p>
                          </div>
                        </div>
                        <a href={a.s3Url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-white/10 transition-colors">
                          <ExternalLink className="h-4 w-4 text-white/50 hover:text-white" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <p className="text-white/60 text-sm">Submitted</p>
                  <p className="text-white text-sm mt-1">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
                <Clock className="h-5 w-5 text-white/20" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button 
                  onClick={()=>{ handleStatus(selectedReport.id, 'resolved'); setSelectedReport(null); }} 
                  className="flex-1 px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
                >
                  Mark Resolved
                </button>
                <button 
                  onClick={()=>{ handleStatus(selectedReport.id, 'rejected'); setSelectedReport(null); }} 
                  className="flex-1 px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                >
                  Reject Report
                </button>
                <button 
                  onClick={()=>{ handleBan(selectedReport.reported.id, selectedReport.reported?.name || 'User'); }} 
                  className="flex-1 px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
                >
                  Ban User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


