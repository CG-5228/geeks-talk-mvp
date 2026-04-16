'use client';
import { useState, useEffect } from 'react';
import { 
  Save, 
  Eye, 
  Upload, 
  X, 
  BookOpen, 
  FileText,
  Image,
  Link,
  Bold,
  Italic,
  List,
  Quote
} from 'lucide-react';
import { BlogPost } from '@/types/admin';

interface BlogEditorProps {
  post?: BlogPost;
  onSave?: (post: BlogPost) => void;
  onCancel?: () => void;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPreviewMarkdown(content: string): string {
  return escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-white/30 pl-4 italic">$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>');
}

export default function BlogEditor({ 
  post, 
  onSave, 
  onCancel, 
  className = '' 
}: BlogEditorProps) {
  const [formData, setFormData] = useState<BlogPost>({
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    published: false,
    ...post
  });
  
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/blog', {
        method: post?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: post?.id,
          ...formData
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        onSave?.(data.post);
      }
    } catch (error) {
      console.error('Failed to save blog post:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // For now, we'll just set the file name as the cover image
    // In a real implementation, you'd upload to S3 and get the URL
    setFormData({ ...formData, coverImage: file.name });
  };
  
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = before + selectedText + after;
    
    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    setFormData({ ...formData, content: newValue });
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };
  
  const formatText = (format: string) => {
    switch (format) {
      case 'bold':
        insertMarkdown('**', '**');
        break;
      case 'italic':
        insertMarkdown('*', '*');
        break;
      case 'quote':
        insertMarkdown('> ');
        break;
      case 'list':
        insertMarkdown('- ');
        break;
    }
  };
  
  return (
    <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          {post?.id ? 'Edit Blog Post' : 'Create Blog Post'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              previewMode 
                ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Eye className="h-4 w-4" />
            {previewMode ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
            placeholder="Enter blog post title..."
          />
        </div>
        
        {/* Excerpt */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Excerpt</label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
            placeholder="Enter a brief excerpt..."
          />
        </div>
        
        {/* Cover Image */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Cover Image</label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="cover-image"
            />
            <label
              htmlFor="cover-image"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/70 hover:bg-white/20 cursor-pointer transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </label>
            {formData.coverImage && (
              <span className="text-white text-sm">{formData.coverImage}</span>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Content</label>
          
          {!previewMode ? (
            <div>
              {/* Toolbar */}
              <div className="flex items-center gap-2 mb-3 p-2 bg-white/5 border border-white/20 rounded-lg">
                <button
                  onClick={() => formatText('bold')}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  onClick={() => formatText('italic')}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  onClick={() => formatText('quote')}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Quote"
                >
                  <Quote className="h-4 w-4" />
                </button>
                <button
                  onClick={() => formatText('list')}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="List"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={15}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 font-mono text-sm"
                placeholder="Write your blog post content in Markdown..."
              />
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
              <div className="prose prose-invert max-w-none">
                <h1 className="text-2xl font-bold text-white mb-4">{formData.title}</h1>
                {formData.excerpt && (
                  <p className="text-white/70 text-lg mb-6 italic">{formData.excerpt}</p>
                )}
                <div 
                  className="text-white"
                  dangerouslySetInnerHTML={{ __html: renderPreviewMarkdown(formData.content) }}
                />
              </div>
            </div>
          )}
        </div>
        
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
            disabled={loading || !formData.title || !formData.content}
            className="flex items-center gap-2 px-6 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d9ff]"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {post?.id ? 'Update Post' : 'Create Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
