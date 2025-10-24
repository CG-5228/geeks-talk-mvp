"use client";
import { useState, useEffect } from 'react';
import { Search, Filter, Download, Share2, FileText, Image, File, Calendar, User } from 'lucide-react';

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
    fetchFiles();
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

  const handleDownload = async (file: ChannelFile) => {
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
  };

  const handleShare = async (file: ChannelFile, type: 'channel' | 'dm' | 'save', targetId?: string) => {
    try {
      setSharingFile(file.id);
      
      const response = await fetch(`/api/live/channels/${channelId}/files/${file.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, targetId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (type === 'save') {
          // Show download link
          window.open(data.downloadUrl, '_blank');
        } else {
          // Show success message
          console.log('File shared successfully');
        }
      } else {
        console.error('Error sharing file:', data.error);
      }
    } catch (error) {
      console.error('Error sharing file:', error);
    } finally {
      setSharingFile(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-400" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-400" />;
    }
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[rgba(220,235,255,0.7)]">Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filters */}
      <div className="p-4 border-b border-[color:var(--divider)]/20 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.5)]" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[color:var(--divider)]/20 rounded-lg text-[rgba(220,235,255,0.9)] placeholder-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[rgba(255,255,255,0.05)] border border-[color:var(--divider)]/20 rounded-lg text-[rgba(220,235,255,0.7)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          {(searchQuery || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-[rgba(220,235,255,0.5)] hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[rgba(220,235,255,0.5)]" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 text-sm bg-[rgba(255,255,255,0.05)] border border-[color:var(--divider)]/20 rounded-lg text-[rgba(220,235,255,0.9)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <span className="text-[rgba(220,235,255,0.5)]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 text-sm bg-[rgba(255,255,255,0.05)] border border-[color:var(--divider)]/20 rounded-lg text-[rgba(220,235,255,0.9)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[rgba(220,235,255,0.7)]">
            <File className="w-12 h-12 mb-4 opacity-50" />
            <p>No files found</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(file.fileType)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-[rgba(220,235,255,0.9)] truncate">
                    {file.fileName}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-[rgba(220,235,255,0.5)]">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>{formatDate(file.createdAt)}</span>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{file.uploader.name || file.uploader.username || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleShare(file, 'save')}
                    disabled={sharingFile === file.id}
                    className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-[rgba(220,235,255,0.7)] hover:text-white transition-colors disabled:opacity-50"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[color:var(--divider)]/20 text-xs text-[rgba(220,235,255,0.5)]">
        {files.length} file{files.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
