"use client";
import { useEffect, useState } from 'react';
import { X, User, Mail, Calendar, FileText, AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react';

interface ReportData {
  id: string;
  category: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string; email: string };
  reported: { id: string; name: string; email: string };
  reviewer?: { id: string; name: string; email: string };
  attachments: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    s3Url: string;
  }>;
}

export default function ReviewModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔍 Fetching report details for ID:', reportId);
        const res = await fetch(`/api/admin/reports/${reportId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load report');
        console.log('📄 Report data received:', json.report);
        console.log('📎 Attachments:', json.report?.attachments);
        setData(json.report);
      } catch (e: any) {
        console.error('❌ Error fetching report:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'reviewed': return 'text-green-400 bg-green-400/20';
      case 'resolved': return 'text-blue-400 bg-blue-400/20';
      case 'dismissed': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'harassment': return 'text-red-400 bg-red-400/20';
      case 'spam': return 'text-orange-400 bg-orange-400/20';
      case 'inappropriate': return 'text-purple-400 bg-purple-400/20';
      case 'other': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#1a1b23] border border-white/20 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-[#00d9ff]" />
            <h3 className="text-xl font-semibold text-white">Report Details</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d9ff]"></div>
              <span className="ml-3 text-white/70">Loading report details...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {/* Report Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-[#00d9ff]" />
                    <span className="text-sm text-white/70">Category</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getCategoryColor(data.category)}`}>
                    {data.category.charAt(0).toUpperCase() + data.category.slice(1)}
                  </span>
                </div>
                
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-[#00d9ff]" />
                    <span className="text-sm text-white/70">Status</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(data.status)}`}>
                    {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                  </span>
                </div>
                
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-[#00d9ff]" />
                    <span className="text-sm text-white/70">Reported</span>
                  </div>
                  <span className="text-white">{new Date(data.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Report Details */}
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#00d9ff]" />
                    Report Details
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-white/70">Reason:</span>
                      <p className="text-white mt-1">{data.reason}</p>
                    </div>
                    {data.description && (
                      <div>
                        <span className="text-sm text-white/70">Description:</span>
                        <p className="text-white mt-1 whitespace-pre-wrap">{data.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Users Involved */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                      <User className="h-5 w-5 text-green-400" />
                      Reporter
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-white/50" />
                        <span className="text-white">{data.reporter.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-white/50" />
                        <span className="text-white/70">{data.reporter.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                      <User className="h-5 w-5 text-red-400" />
                      Reported User
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-white/50" />
                        <span className="text-white">{data.reported.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-white/50" />
                        <span className="text-white/70">{data.reported.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                {data.attachments && data.attachments.length > 0 && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#00d9ff]" />
                      Attachments ({data.attachments.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.attachments.map((attachment) => (
                        <div key={attachment.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-white truncate">{attachment.fileName}</p>
                              <p className="text-sm text-white/50">{formatFileSize(attachment.fileSize)}</p>
                            </div>
                            <a
                              href={attachment.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 px-3 py-1 bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 text-[#00d9ff] rounded text-sm transition-colors"
                            >
                              View
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviewer Info */}
                {data.reviewer && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-[#00d9ff]" />
                      Reviewed By
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-white/50" />
                        <span className="text-white">{data.reviewer.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-white/50" />
                        <span className="text-white/70">{data.reviewer.email}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
