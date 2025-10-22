'use client';
import { useState, useEffect } from 'react';
import { Video, Plus, Edit, Trash2, Play, Calendar, User, Globe, HardDrive } from 'lucide-react';
import TutorialUploader from '@/components/admin/TutorialUploader';
import { TutorialVideo } from '@/types/admin';

export default function TutorialsPage() {
  const [videos, setVideos] = useState<TutorialVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TutorialVideo | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  
  useEffect(() => {
    fetchVideos();
  }, []);
  
  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/admin/tutorials');
      const data = await response.json();
      setVideos(data.videos);
    } catch (error) {
      console.error('Failed to fetch tutorial videos:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveVideo = (video: TutorialVideo) => {
    if (editingVideo) {
      setVideos(videos.map(v => v.id === video.id ? video : v));
    } else {
      setVideos([video, ...videos]);
    }
    setShowUploader(false);
    setEditingVideo(null);
  };
  
  const handleEditVideo = (video: TutorialVideo) => {
    setEditingVideo(video);
    setShowUploader(true);
  };
  
  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this tutorial video?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/tutorials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: videoId })
      });
      
      if (response.ok) {
        setVideos(videos.filter(v => v.id !== videoId));
      }
    } catch (error) {
      console.error('Failed to delete tutorial video:', error);
    }
  };
  
  const handlePlayVideo = (video: TutorialVideo) => {
    if (video.videoUrl) {
      window.open(video.videoUrl, '_blank');
    } else if (video.s3Url) {
      window.open(video.s3Url, '_blank');
    }
  };
  
  const filteredVideos = videos.filter(video => {
    switch (filter) {
      case 'published':
        return video.published;
      case 'draft':
        return !video.published;
      default:
        return true;
    }
  });
  
  if (showUploader) {
    return (
      <div className="p-6">
        <TutorialUploader
          video={editingVideo || undefined}
          onSave={handleSaveVideo}
          onCancel={() => {
            setShowUploader(false);
            setEditingVideo(null);
          }}
        />
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Tutorial Videos</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-white/70" />
              <span className="text-white/70 text-sm">{videos.length} videos</span>
            </div>
            <button
              onClick={() => setShowUploader(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Video
            </button>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'published', 'draft'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === filterType
                  ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div key={video.id} className="bg-white/5 border border-white/20 rounded-lg overflow-hidden">
              {/* Thumbnail */}
              <div className="relative h-48 bg-white/10">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Video className="h-12 w-12 text-white/30" />
                  </div>
                )}
                
                {/* Play Button */}
                <button
                  onClick={() => handlePlayVideo(video)}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                >
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                </button>
                
                {/* Source Badge */}
                <div className="absolute top-2 right-2">
                  {video.videoUrl ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                      <Globe className="h-3 w-3" />
                      URL
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      <HardDrive className="h-3 w-3" />
                      S3
                    </div>
                  )}
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  {video.published ? (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      Published
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                      Draft
                    </span>
                  )}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4">
                <h3 className="font-medium text-white mb-2 line-clamp-2">{video.title}</h3>
                
                {video.description && (
                  <p className="text-white/70 text-sm mb-3 line-clamp-2">{video.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{video.uploader?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {video.publishedAt 
                        ? new Date(video.publishedAt).toLocaleDateString()
                        : video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Unknown'
                      }
                    </span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlayVideo(video)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 text-white/70 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    Play
                  </button>
                  <button
                    onClick={() => handleEditVideo(video)}
                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Edit video"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => video.id && handleDeleteVideo(video.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Delete video"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <Video className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No tutorial videos found</h3>
            <p className="text-white/70">
              {filter === 'all' 
                ? 'Upload your first tutorial video to get started.' 
                : `No ${filter} videos found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}