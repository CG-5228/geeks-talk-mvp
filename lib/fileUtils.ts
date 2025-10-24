export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

/**
 * Parse file attachments from message content
 * Looks for patterns like "📎 filename.ext" and extracts file information
 * For now, we'll create mock file data, but in production this would
 * be enhanced to fetch actual file metadata from the database
 */
export function parseFileAttachments(content: string): FileAttachment[] {
  const filePattern = /📎\s+(.+)/g;
  const attachments: FileAttachment[] = [];
  let match;

  while ((match = filePattern.exec(content)) !== null) {
    const fileName = match[1].trim();
    
    // Extract file extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Determine MIME type based on extension
    const mimeType = getMimeTypeFromExtension(fileExtension);
    
    // For now, create a placeholder URL
    // In production, this would fetch the actual file data from the channel files API
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fileUrl = `/api/live/channels/files/${fileId}`; // This would be the actual download URL
    
    attachments.push({
      id: fileId,
      name: fileName,
      type: mimeType,
      url: fileUrl
    });
  }

  return attachments;
}

/**
 * Get MIME type from file extension
 */
function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    'heic': 'image/heic',
    'heif': 'image/heif',
    
    // Videos
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // Code
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'html': 'text/html',
    'css': 'text/css',
    'json': 'application/json',
    'xml': 'application/xml',
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Check if a file type is an image
 */
export function isImageFile(fileType: string): boolean {
  return fileType.startsWith('image/');
}

/**
 * Check if a file type is a video
 */
export function isVideoFile(fileType: string): boolean {
  return fileType.startsWith('video/');
}

/**
 * Check if a file type is an audio file
 */
export function isAudioFile(fileType: string): boolean {
  return fileType.startsWith('audio/');
}

/**
 * Get a human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
