'use client';
import { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  Download, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Calendar,
  User,
  HardDrive
} from 'lucide-react';

interface FileRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  s3Key: string;
  s3Url: string;
  source: 'voice' | 'channel';
}

interface FileManagerProps {
  className?: string;
}

export default function FileManager({ className = '' }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  useEffect(() => {
    fetchFiles();
  }, []);
  
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/admin/files');
      const data = await response.json();
      // Map the API response to match our interface
      const mappedFiles = data.files.map((file: any) => ({
        ...file,
        uploadedBy: file.uploader, // Map uploader to uploadedBy
        channel: file.group?.channel // Map group.channel to channel
      }));
      setFiles(mappedFiles);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      });
      
      if (response.ok) {
        fetchFiles();
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };
  
  const handleDownloadFile = (file: FileRecord) => {
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = file.s3Url;
    link.download = file.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleViewFile = (file: FileRecord) => {
    // Open file in new tab for viewing
    window.open(file.s3Url, '_blank');
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📁';
  };
  
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.uploadedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = !filterChannel || file.channel?.name === filterChannel;
    const matchesType = !filterType || file.fileType.includes(filterType);
    
    return matchesSearch && matchesChannel && matchesType;
  });
  
  const uniqueChannels = Array.from(new Set(files.map(f => f.channel?.name).filter(Boolean)));
  const uniqueTypes = Array.from(new Set(files.map(f => f.fileType.split('/')[0]).filter(Boolean)));
  
  if (loading) {
    return (
      <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">File Manager</h2>
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-white/70" />
          <span className="text-white/70 text-sm">{files.length} files</span>
        </div>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
          />
        </div>
        
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
        >
          <option value="">All Channels</option>
          {uniqueChannels.map(channel => (
            <option key={channel} value={channel}>{channel}</option>
          ))}
        </select>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
        >
          <option value="">All Types</option>
          {uniqueTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      
      {/* Files Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left py-3 px-4 text-white/70 font-medium">File</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Size</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Source</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Channel</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Uploaded By</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Date</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map((file) => (
              <tr key={file.id} className="border-b border-white/10 hover:bg-white/5">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(file.fileType)}</span>
                    <div>
                      <div className="font-medium text-white">{file.fileName}</div>
                      <div className="text-sm text-white/50">{file.fileType}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-white">{formatFileSize(file.fileSize)}</span>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    file.source === 'voice' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {file.source === 'voice' ? 'Voice Chat' : 'Text Channel'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-white/50" />
                    <span className="text-white">
                      {file.channel?.name || 'Direct Upload'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-white/50" />
                    <div>
                      <div className="text-white text-sm">{file.uploadedBy?.name || 'Unknown User'}</div>
                      <div className="text-white/50 text-xs">{file.uploadedBy?.email || 'No email'}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-white/50" />
                    <span className="text-white text-sm">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewFile(file)}
                      className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      title="View file"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <File className="h-16 w-16 text-white/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No files found</h3>
          <p className="text-white/70">
            {searchTerm || filterChannel || filterType 
              ? 'Try adjusting your search or filters.' 
              : 'No files have been uploaded yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
