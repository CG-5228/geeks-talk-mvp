"use client";
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Upload, File, Image, FileText, Download, Trash2, X } from 'lucide-react';
import { useStyledDialog } from '../ui/StyledDialog';
import { useNotifications } from '../ui/NotificationSystem';

interface GroupFileShareProps {
  groupId: string;
}

interface GroupFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  uploader: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

export default function GroupFileShare({ groupId }: GroupFileShareProps) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<GroupFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showDialog, DialogComponent } = useStyledDialog();
  const { showNotification } = useNotifications();

  useEffect(() => {
    fetchFiles();
  }, [groupId]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/voice/groups/${groupId}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        showNotification({
          title: 'File Too Large',
          message: 'File size must be less than 10MB.',
          type: 'error',
          duration: 4000,
        });
        return;
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!allowedTypes.includes(file.type)) {
        showNotification({
          title: 'File Type Not Supported',
          message: 'Only images, PDFs, text files, and Word documents are allowed.',
          type: 'error',
          duration: 4000,
        });
        return;
      }

      setSelectedFile(file);
      setShowUpload(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/voice/groups/${groupId}/files`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(prev => [data.file, ...prev]);
        showNotification({
          title: 'File Uploaded',
          message: `${selectedFile.name} has been shared with the group.`,
          type: 'success',
          duration: 4000,
        });
        setShowUpload(false);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const error = await response.json();
        showNotification({
          title: 'Upload Failed',
          message: error.error || 'Failed to upload file. Please try again.',
          type: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showNotification({
        title: 'Upload Error',
        message: 'Failed to upload file. Please check your connection and try again.',
        type: 'error',
        duration: 4000,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: GroupFile) => {
    try {
      const response = await fetch(`/api/voice/groups/${groupId}/files/${file.id}`);
      if (response.ok) {
        const data = await response.json();
        window.open(data.downloadUrl, '_blank');
      } else {
        showNotification({
          title: 'Download Failed',
          message: 'Failed to generate download link. Please try again.',
          type: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      showNotification({
        title: 'Download Error',
        message: 'Failed to download file. Please try again.',
        type: 'error',
        duration: 4000,
      });
    }
  };

  const handleDelete = async (file: GroupFile) => {
    const confirmed = await new Promise((resolve) => {
      showDialog({
        title: 'Delete File',
        message: `Are you sure you want to delete "${file.fileName}"? This action cannot be undone.`,
        type: 'warning',
        isConfirm: true,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/voice/groups/${groupId}/files/${file.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== file.id));
        showNotification({
          title: 'File Deleted',
          message: `${file.fileName} has been deleted.`,
          type: 'success',
          duration: 3000,
        });
      } else {
        const error = await response.json();
        showNotification({
          title: 'Delete Failed',
          message: error.error || 'Failed to delete file. Please try again.',
          type: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showNotification({
        title: 'Delete Error',
        message: 'Failed to delete file. Please try again.',
        type: 'error',
        duration: 4000,
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4 text-green-400" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-400" />;
    } else if (fileType.startsWith('text/')) {
      return <FileText className="w-4 h-4 text-blue-400" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    } else {
      return <File className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-white/5 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-border/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Upload className="w-4 h-4 text-purple-400" />
          Shared Files
        </h3>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.txt,.doc,.docx"
      />

      {/* Upload Dialog */}
      {showUpload && selectedFile && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-border/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getFileIcon(selectedFile.type)}
              <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">({formatFileSize(selectedFile.size)})</span>
            </div>
            <button
              onClick={() => {
                setShowUpload(false);
                setSelectedFile(null);
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              onClick={() => {
                setShowUpload(false);
                setSelectedFile(null);
              }}
              disabled={uploading}
              className="flex-1 px-3 py-2 border border-border/20 text-foreground rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {files.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No files shared yet</p>
          </div>
        ) : (
          files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex-shrink-0">
                {getFileIcon(file.fileType)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.fileName}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(file.fileSize)}</span>
                  <span>•</span>
                  <span>by {file.uploader.name || file.uploader.username || 'Unknown'}</span>
                  <span>•</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDownload(file)}
                  className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                
                {file.uploader.id === session?.user?.id && (
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <DialogComponent />
    </div>
  );
}
