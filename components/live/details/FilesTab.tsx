"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Download, Share2, FileText, Image, File, Calendar, User, Loader2, X } from 'lucide-react';

interface ChannelFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  downloadUrl: string | null;
  uploader: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

interface FilesTabProps {
  channelId: string;
}

export default function FilesTab({ channelId }: FilesTabProps) {
  const [files, setFiles] = useState<ChannelFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharingFile, setSharingFile] = useState<string | null>(null);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchFiles();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [channelId, searchQuery, startDate, endDate]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/live/channels/${channelId}/files?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      setFiles(data.files);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = useCallback(async (file: ChannelFile) => {
    if (!file.downloadUrl) {
      console.error('No download URL available');
      return;
    }
    
    try {
      const response = await fetch(file.downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }, []);

  const handleShare = useCallback(async (file: ChannelFile, type: 'save') => {
    try {
      setSharingFile(file.id);
      
      const response = await fetch(`/api/live/channels/${channelId}/files/${file.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });
      
      const data = await response.json();
      
      if (response.ok && type === 'save') {
        window.open(data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Error sharing file:', error);
    } finally {
      setSharingFile(null);
    }
  }, [channelId]);

  const getFileIcon = useCallback((fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-400" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-400" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  }, []);

  const filteredFiles = useMemo(() => {
    return files;
  }, [files]);

  const hasActiveFilters = searchQuery || startDate || endDate;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-transparent via-white/[0.01] to-white/[0.02]">
      {/* Search and Filters */}
      <div className="p-4 border-b border-white/5 space-y-3 flex-shrink-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.4)] group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[rgba(220,235,255,0.9)] placeholder-[rgba(220,235,255,0.4)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              showFilters
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 border border-white/10 text-[rgba(220,235,255,0.6)] hover:text-white hover:bg-white/10'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-[rgba(220,235,255,0.5)] hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[rgba(220,235,255,0.4)]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-[rgba(220,235,255,0.9)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              <span className="text-xs text-[rgba(220,235,255,0.5)]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-[rgba(220,235,255,0.9)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Files List or States */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-[rgba(220,235,255,0.5)]">Loading files...</p>
          </div>
        )}

        {error && (
          <div className="m-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && filteredFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <File className="w-12 h-12 text-[rgba(220,235,255,0.2)]" />
            <p className="text-sm text-[rgba(220,235,255,0.5)]">
              {searchQuery ? 'No files found' : 'No files shared yet'}
            </p>
          </div>
        )}

        {!loading && !error && filteredFiles.length > 0 && (
          <div className="p-3 space-y-2">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all duration-200 group"
              >
                {/* File Icon */}
                <div className="flex-shrink-0 p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-all">
                  {getFileIcon(file.fileType)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-[rgba(220,235,255,0.9)] truncate text-sm">
                    {file.fileName}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-[rgba(220,235,255,0.4)] mt-1">
                    <span className="flex items-center gap-1">
                      {formatFileSize(file.fileSize)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(file.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {file.uploader.name || file.uploader.username || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 rounded-md hover:bg-blue-500/20 text-[rgba(220,235,255,0.6)] hover:text-blue-400 transition-all duration-200"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleShare(file, 'save')}
                    disabled={sharingFile === file.id}
                    className="p-1.5 rounded-md hover:bg-blue-500/20 text-[rgba(220,235,255,0.6)] hover:text-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save"
                  >
                    {sharingFile === file.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {!loading && !error && filteredFiles.length > 0 && (
        <div className="p-3 border-t border-white/5 bg-white/[0.02] text-xs text-[rgba(220,235,255,0.4)] flex-shrink-0">
          <div className="flex justify-between">
            <span>{filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}</span>
            <span>{formatFileSize(filteredFiles.reduce((sum, f) => sum + f.fileSize, 0))} total</span>
          </div>
        </div>
      )}
    </div>
  );
}
