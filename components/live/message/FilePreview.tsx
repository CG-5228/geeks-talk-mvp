"use client";
import { useState } from 'react';
import { Download, File, Image, FileText, Music, Video, Archive, FileSpreadsheet, Presentation } from 'lucide-react';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

interface FilePreviewProps {
  files: FileAttachment[];
  isOwnMessage?: boolean;
}

export default function FilePreview({ files, isOwnMessage = false }: FilePreviewProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="w-5 h-5" />;
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <Presentation className="w-5 h-5" />;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return <Archive className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getFileTypeColor = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'from-blue-500 to-purple-500';
    if (fileType.startsWith('video/')) return 'from-red-500 to-pink-500';
    if (fileType.startsWith('audio/')) return 'from-green-500 to-teal-500';
    if (fileType === 'application/pdf') return 'from-red-600 to-red-500';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'from-green-600 to-green-500';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'from-orange-600 to-orange-500';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return 'from-gray-600 to-gray-500';
    return 'from-gray-500 to-gray-400';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleImageError = (fileId: string) => {
    setImageErrors(prev => new Set(prev).add(fileId));
  };

  const handleDownload = async (file: FileAttachment) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const isImage = file.type.startsWith('image/');
        const hasImageError = imageErrors.has(file.id);

        return (
          <div key={file.id} className="relative group">
            {isImage && !hasImageError ? (
              // Image Preview
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={file.url}
                    alt={file.name}
                    className="max-w-xs max-h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onError={() => handleImageError(file.id)}
                    onClick={() => window.open(file.url, '_blank')}
                  />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    {file.name}
                  </div>
                </div>
              </div>
            ) : (
              // File Bubble
              <div 
                className={`relative overflow-hidden rounded-xl cursor-pointer hover:scale-[1.02] transition-transform ${
                  isOwnMessage 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 dark:from-gray-700 dark:to-gray-800 dark:text-gray-200'
                }`}
                onClick={() => handleDownload(file)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white/20 ${isOwnMessage ? 'text-white' : 'text-gray-600'}`}>
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate mb-1">
                        {file.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs opacity-80">
                        <span>{file.type.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                        <span>•</span>
                        <span>Click to download</span>
                      </div>
                    </div>
                    <Download className="w-4 h-4 opacity-60" />
                  </div>
                </div>
                
                {/* Decorative gradient overlay */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-10 translate-x-10`} />
                <div className={`absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-8 -translate-x-8`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
