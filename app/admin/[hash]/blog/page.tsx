'use client';
import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit, Trash2, Eye, Calendar, User } from 'lucide-react';
import BlogEditor from '@/components/admin/BlogEditor';
import { BlogPost } from '@/types/admin';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  
  useEffect(() => {
    fetchPosts();
  }, []);
  
  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/blog');
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSavePost = (post: BlogPost) => {
    if (editingPost) {
      setPosts((posts || []).map(p => p.id === post.id ? post : p));
    } else {
      setPosts([post, ...(posts || [])]);
    }
    setShowEditor(false);
    setEditingPost(null);
  };
  
  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setShowEditor(true);
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId })
      });
      
      if (response.ok) {
        setPosts((posts || []).filter(p => p.id !== postId));
      }
    } catch (error) {
      console.error('Failed to delete blog post:', error);
    }
  };
  
  const filteredPosts = (posts || []).filter(post => {
    switch (filter) {
      case 'published':
        return post.published;
      case 'draft':
        return !post.published;
      default:
        return true;
    }
  });
  
  if (showEditor) {
    return (
      <div className="p-6">
        <BlogEditor
          post={editingPost || undefined}
          onSave={handleSavePost}
          onCancel={() => {
            setShowEditor(false);
            setEditingPost(null);
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
              <div key={i} className="h-16 bg-white/10 rounded"></div>
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
          <h2 className="text-xl font-semibold text-white">Blog Management</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-white/70" />
              <span className="text-white/70 text-sm">{(posts || []).length} posts</span>
            </div>
            <button
              onClick={() => setShowEditor(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Post
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
        
        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} className="p-4 bg-white/5 border border-white/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-white">{post.title}</h3>
                    {post.published ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  
                  {post.excerpt && (
                    <p className="text-white/70 text-sm mb-3 line-clamp-2">{post.excerpt}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-white/50">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{post.author?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {post.publishedAt 
                          ? new Date(post.publishedAt).toLocaleDateString()
                          : post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{post._count?.comments || 0} comments</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditPost(post)}
                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Edit post"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => post.id && handleDeletePost(post.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No blog posts found</h3>
            <p className="text-white/70">
              {filter === 'all' 
                ? 'Create your first blog post to get started.' 
                : `No ${filter} posts found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}