'use client';
import { useState } from 'react';
import { 
  Upload, 
  Link, 
  Save, 
  X, 
  Video, 
  FileText,
  Globe,
  HardDrive
} from 'lucide-react';
import { TutorialVideo } from '@/types/admin';

interface TutorialUploaderProps {
  video?: TutorialVideo;
  onSave?: (video: TutorialVideo) => void;
  onCancel?: () => void;
  className?: string;
}

export default function TutorialUploader({ 
  video, 
  onSave, 
  onCancel, 
  className = '' 
}: TutorialUploaderProps) {
  const [formData, setFormData] = useState<TutorialVideo>({
    title: '',
    description: '',
    videoUrl: '',
    published: false,
    ...video
  });
  
  const [loading, setLoading] = useState(false);
  const [uploadType, setUploadType] = useState<'url' | 'file'>('url');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const handleSave = async () => {
    setLoading(true);
    try {
      let response;
      
      if (video?.id) {
        // PUT request for updating - send JSON
        response = await fetch('/api/admin/tutorials', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: video.id,
            ...formData
          })
        });
      } else {
        // POST request for creating - send FormData
        const uploadFormData = new FormData();
        uploadFormData.append('title', formData.title);
        uploadFormData.append('description', formData.description || '');
        uploadFormData.append('videoUrl', formData.videoUrl || '');
        uploadFormData.append('published', formData.published.toString());
        
        response = await fetch('/api/admin/tutorials', {
          method: 'POST',
          body: uploadFormData
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        onSave?.(data.video);
      } else {
        const errorData = await response.json();
        console.error('Failed to save tutorial video:', errorData.error);
        alert(`Failed to save tutorial video: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to save tutorial video:', error);
      alert('Failed to save tutorial video. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setUploadProgress(0);
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('published', formData.published.toString());
      uploadFormData.append('file', file);
      
      const response = await fetch('/api/admin/tutorials', {
        method: 'POST',
        body: uploadFormData
      });
      
      if (response.ok) {
        const data = await response.json();
        onSave?.(data.video);
      }
    } catch (error) {
      console.error('Failed to upload video:', error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };
  
  const getVideoThumbnail = (url: string): string => {
    // For YouTube videos
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    // For Vimeo videos
    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        return `https://vumbnail.com/${videoId}.jpg`;
      }
    }
    
    return '';
  };
  
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  return (
    <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          {video?.id ? 'Edit Tutorial Video' : 'Create Tutorial Video'}
        </h2>
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-white/70" />
          <span className="text-white/70 text-sm">Tutorial Management</span>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Upload Type Selection */}
        <div>
          <label className="block text-sm text-white/70 mb-3">Upload Method</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setUploadType('url')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                uploadType === 'url'
                  ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Globe className="h-4 w-4" />
              External URL
            </button>
            <button
              onClick={() => setUploadType('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                uploadType === 'file'
                  ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <HardDrive className="h-4 w-4" />
              Upload File
            </button>
          </div>
        </div>
        
        {/* Title */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
            placeholder="Enter tutorial title..."
          />
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
            placeholder="Enter tutorial description..."
          />
        </div>
        
        {/* Video URL or File Upload */}
        {uploadType === 'url' ? (
          <div>
            <label className="block text-sm text-white/70 mb-2">Video URL</label>
            <div className="space-y-3">
              <input
                type="url"
                value={formData.videoUrl || ''}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              />
              
              {formData.videoUrl && validateUrl(formData.videoUrl) && (
                <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Link className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/70">Preview</span>
                  </div>
                  {getVideoThumbnail(formData.videoUrl) && (
                    <img
                      src={getVideoThumbnail(formData.videoUrl)}
                      alt="Video thumbnail"
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                  )}
                  <p className="text-sm text-white/70">
                    Supported platforms: YouTube, Vimeo, and direct video URLs
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-white/70 mb-2">Video File</label>
            <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="cursor-pointer"
              >
                <Upload className="h-12 w-12 text-white/50 mx-auto mb-4" />
                <p className="text-white/70 mb-2">Click to upload video file</p>
                <p className="text-white/50 text-sm">
                  Supports MP4, MOV, AVI, and other video formats
                </p>
              </label>
              
              {uploadProgress > 0 && (
                <div className="mt-4">
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-[#00d9ff] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-white/70 text-sm mt-2">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Thumbnail */}
        {formData.thumbnail && (
          <div>
            <label className="block text-sm text-white/70 mb-2">Thumbnail</label>
            <div className="flex items-center gap-4">
              <img
                src={formData.thumbnail}
                alt="Video thumbnail"
                className="w-32 h-20 object-cover rounded-lg"
              />
              <button
                onClick={() => setFormData({ ...formData, thumbnail: '' })}
                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Publish Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="published"
            checked={formData.published}
            onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
            className="w-4 h-4 text-green-400 bg-white/10 border-white/20 rounded focus:ring-green-400/50"
          />
          <label htmlFor="published" className="text-white/70">
            Publish immediately
          </label>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/20">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading || !formData.title || (!formData.videoUrl && uploadType === 'url')}
            className="flex items-center gap-2 px-6 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d9ff]"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {video?.id ? 'Update Video' : 'Create Video'}
          </button>
        </div>
      </div>
    </div>
  );
}
