'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Eye,
  MessageCircle,
  Heart,
  Calendar,
  Clock,
  Search,
  Star,
  StarOff,
  Globe,
  FileText,
  CheckCircle2,
  XCircle,
  User,
  ImageOff,
  Tag,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsCard from '@/components/admin/StatsCard';
import BulkActionBar from '@/components/admin/BulkActionBar';
import BlogEditor from '@/components/admin/BlogEditor';
import { useAdminToast } from '@/components/admin/AdminToast';
import { BlogPost } from '@/types/admin';

type FilterTab = 'all' | 'published' | 'draft' | 'featured';
type SortKey = 'recent' | 'oldest' | 'most-viewed' | 'most-commented' | 'title';

const PAGE_SIZE = 12;

export default function BlogPage() {
  const toast = useAdminToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
      toast.push({ tone: 'error', title: 'Failed to load posts' });
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p) => p.published).length;
    const drafts = total - published;
    const views = posts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);
    const comments = posts.reduce((sum, p) => sum + (p._count?.comments ?? 0), 0);
    const reactions = posts.reduce((sum, p) => sum + (p._count?.reactions ?? 0), 0);
    const featured = posts.filter((p) => p.featured).length;
    return { total, published, drafts, views, comments, reactions, featured };
  }, [posts]);

  const filtered = useMemo(() => {
    let list = posts;
    if (filter === 'published') list = list.filter((p) => p.published);
    else if (filter === 'draft') list = list.filter((p) => !p.published);
    else if (filter === 'featured') list = list.filter((p) => p.featured);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.title,
          p.excerpt || '',
          (p.tags ?? []).join(' '),
          p.author?.name || '',
          p.slug || '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = [...list];
    switch (sort) {
      case 'oldest':
        sorted.sort(
          (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
        );
        break;
      case 'most-viewed':
        sorted.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
        break;
      case 'most-commented':
        sorted.sort((a, b) => (b._count?.comments ?? 0) - (a._count?.comments ?? 0));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'recent':
      default:
        sorted.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        );
    }
    return sorted;
  }, [posts, filter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  useEffect(() => {
    setPage(1);
  }, [filter, sort, search]);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    const ids = paginated.map((p) => p.id).filter(Boolean) as string[];
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const openNew = () => {
    setEditingPost(null);
    setShowEditor(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  const handleEditorSave = (saved: BlogPost) => {
    setPosts((prev) => {
      if (!saved.id) return prev;
      const exists = prev.some((p) => p.id === saved.id);
      if (exists) return prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p));
      return [saved, ...prev];
    });
    setEditingPost(saved);
  };

  const setRowBusyState = (id: string, busy: boolean) => {
    setRowBusy((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const updatePost = async (post: BlogPost, patch: Partial<BlogPost>) => {
    if (!post.id) return;
    setRowBusyState(post.id, true);
    const previous = post;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...patch } : p)));
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...data.post } : p)));
    } catch (error) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? previous : p)));
      toast.push({
        tone: 'error',
        title: 'Update failed',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setRowBusyState(post.id, false);
    }
  };

  const togglePublish = (post: BlogPost) => {
    const next = !post.published;
    updatePost(post, {
      published: next,
      publishedAt: next ? new Date().toISOString() : null,
    });
    toast.push({
      tone: 'success',
      title: next ? 'Post published' : 'Moved to drafts',
      duration: 2500,
    });
  };

  const toggleFeatured = (post: BlogPost) => {
    updatePost(post, { featured: !post.featured });
    toast.push({
      tone: 'info',
      title: post.featured ? 'Removed from featured' : 'Marked as featured',
      duration: 2500,
    });
  };

  const deletePost = async (post: BlogPost) => {
    if (!post.id) return;
    const confirmed = await toast.confirm({
      title: 'Delete this post?',
      description: `"${post.title}" and all its comments and reactions will be permanently removed.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;

    setRowBusyState(post.id, true);
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(post.id!);
        return next;
      });
      toast.push({ tone: 'success', title: 'Post deleted' });
    } catch (error) {
      toast.push({
        tone: 'error',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setRowBusyState(post.id, false);
    }
  };

  type BulkAction = 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete';

  const runBulk = async (action: BulkAction) => {
    if (selected.size === 0 || bulkBusy) return;
    const ids = Array.from(selected);

    if (action === 'delete') {
      const confirmed = await toast.confirm({
        title: `Delete ${ids.length} post${ids.length === 1 ? '' : 's'}?`,
        description: 'This will remove the posts along with their comments and reactions.',
        confirmLabel: 'Delete',
        tone: 'danger',
      });
      if (!confirmed) return;
    }

    setBulkBusy(true);
    try {
      const res = await fetch('/api/admin/blog/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk action failed');

      setPosts((prev) => {
        if (action === 'delete') {
          return prev.filter((p) => !selected.has(p.id!));
        }
        return prev.map((p) => {
          if (!selected.has(p.id!)) return p;
          if (action === 'publish') return { ...p, published: true, publishedAt: new Date().toISOString() };
          if (action === 'unpublish') return { ...p, published: false, publishedAt: null };
          if (action === 'feature') return { ...p, featured: true };
          if (action === 'unfeature') return { ...p, featured: false };
          return p;
        });
      });

      const label =
        action === 'delete'
          ? 'deleted'
          : action === 'publish'
            ? 'published'
            : action === 'unpublish'
              ? 'moved to drafts'
              : action === 'feature'
                ? 'featured'
                : 'unfeatured';
      toast.push({ tone: 'success', title: `${data.count ?? ids.length} post${ids.length === 1 ? '' : 's'} ${label}` });
      clearSelection();
    } catch (error) {
      toast.push({
        tone: 'error',
        title: 'Bulk action failed',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBulkBusy(false);
    }
  };

  if (showEditor) {
    return (
      <BlogEditor
        post={editingPost || undefined}
        onSave={handleEditorSave}
        onCancel={() => {
          setShowEditor(false);
          setEditingPost(null);
        }}
      />
    );
  }

  const tabCounts: Record<FilterTab, number> = {
    all: stats.total,
    published: stats.published,
    draft: stats.drafts,
    featured: stats.featured,
  };

  return (
    <div className="p-6">
      <AdminHeader
        title="Blog"
        description="Write, publish, and curate posts for the GeeksTalk blog."
        icon={BookOpen}
        iconTone="primary"
        actions={
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New post
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatsCard title="Total posts" value={stats.total} icon={BookOpen} tone="primary" />
        <StatsCard title="Published" value={stats.published} icon={Globe} tone="success" />
        <StatsCard title="Drafts" value={stats.drafts} icon={FileText} tone="warning" />
        <StatsCard title="Views" value={stats.views} icon={Eye} tone="info" />
        <StatsCard title="Comments" value={stats.comments} icon={MessageCircle} tone="accent" />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, excerpt, tag, or author…"
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort posts"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground outline-none focus:border-primary/40 transition-all"
        >
          <option value="recent" className="bg-background">Newest first</option>
          <option value="oldest" className="bg-background">Oldest first</option>
          <option value="most-viewed" className="bg-background">Most viewed</option>
          <option value="most-commented" className="bg-background">Most commented</option>
          <option value="title" className="bg-background">Title (A–Z)</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1 mb-5 border-b border-white/10">
        {(['all', 'published', 'draft', 'featured'] as const).map((tab) => (
          <FilterPill
            key={tab}
            active={filter === tab}
            onClick={() => setFilter(tab)}
            label={tab === 'all' ? 'All' : tab === 'draft' ? 'Drafts' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            count={tabCounts[tab]}
          />
        ))}
      </div>

      <BulkActionBar
        count={selected.size}
        onClear={clearSelection}
        label={selected.size === 1 ? 'post selected' : 'posts selected'}
        actions={[
          { label: 'Publish', icon: Globe, tone: 'success', disabled: bulkBusy, onClick: () => runBulk('publish') },
          { label: 'Unpublish', icon: XCircle, tone: 'neutral', disabled: bulkBusy, onClick: () => runBulk('unpublish') },
          { label: 'Feature', icon: Star, tone: 'primary', disabled: bulkBusy, onClick: () => runBulk('feature') },
          { label: 'Unfeature', icon: StarOff, tone: 'neutral', disabled: bulkBusy, onClick: () => runBulk('unfeature') },
          { label: 'Delete', icon: Trash2, tone: 'error', disabled: bulkBusy, onClick: () => runBulk('delete') },
        ]}
      />

      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} hasSearch={!!search.trim()} onNew={openNew} />
      ) : (
        <>
          <div className="flex items-center justify-between px-1 mb-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={paginated.length > 0 && paginated.every((p) => p.id && selected.has(p.id))}
                ref={(el) => {
                  if (el) {
                    const some = paginated.some((p) => p.id && selected.has(p.id));
                    const all = paginated.length > 0 && paginated.every((p) => p.id && selected.has(p.id));
                    el.indeterminate = some && !all;
                  }
                }}
                onChange={togglePage}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-primary cursor-pointer"
              />
              Select page
            </label>
            <p className="text-xs text-muted-foreground tabular-nums">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
          </div>

          <div className="space-y-3">
            {paginated.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                selected={post.id ? selected.has(post.id) : false}
                busy={post.id ? rowBusy.has(post.id) : false}
                onToggleSelect={() => post.id && toggleRow(post.id)}
                onEdit={() => openEdit(post)}
                onDelete={() => deletePost(post)}
                onTogglePublish={() => togglePublish(post)}
                onToggleFeatured={() => toggleFeatured(post)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6">
              <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Previous
              </PageBtn>
              <span className="px-3 text-xs text-muted-foreground tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              <PageBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next
              </PageBtn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      <span
        className={`ml-2 inline-flex items-center justify-center min-w-[1.5rem] px-1.5 h-5 rounded-full text-xs tabular-nums ${
          active ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground'
        }`}
      >
        {count}
      </span>
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
    </button>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 h-8 rounded-md bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
    >
      {children}
    </button>
  );
}

interface PostRowProps {
  post: BlogPost;
  selected: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onToggleFeatured: () => void;
}

function PostRow({
  post,
  selected,
  busy,
  onToggleSelect,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeatured,
}: PostRowProps) {
  const dateStr = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : post.createdAt
      ? new Date(post.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

  return (
    <div
      className={`group relative flex gap-4 p-4 rounded-xl border transition-all ${
        selected
          ? 'bg-primary/10 border-primary/30'
          : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
      } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <div className="flex items-start pt-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${post.title}`}
          className="h-4 w-4 rounded border-white/20 bg-white/5 accent-primary cursor-pointer"
        />
      </div>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${post.title}`}
        className="relative h-20 w-28 sm:h-24 sm:w-36 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt=""
            fill
            sizes="144px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <button
            type="button"
            onClick={onEdit}
            className="text-left font-semibold text-foreground hover:text-primary transition-colors line-clamp-2"
          >
            {post.title || 'Untitled'}
          </button>
          {post.published ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success border border-success/30">
              <CheckCircle2 className="h-3 w-3" />
              Published
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/30">
              <FileText className="h-3 w-3" />
              Draft
            </span>
          )}
          {post.featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30">
              <Star className="h-3 w-3 fill-current" />
              Featured
            </span>
          )}
        </div>

        {post.excerpt && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
        )}

        {(post.tags?.length ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {post.tags!.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-muted-foreground text-xs"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {(post.tags?.length ?? 0) > 5 && (
              <span className="text-xs text-muted-foreground">+{post.tags!.length - 5}</span>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {post.author?.name || 'Unknown'}
          </span>
          {dateStr && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateStr}
            </span>
          )}
          {post.readingTimeMinutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTimeMinutes} min read
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1" title="Views">
            <Eye className="h-3 w-3" />
            {(post.viewCount ?? 0).toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1" title="Comments">
            <MessageCircle className="h-3 w-3" />
            {post._count?.comments ?? 0}
          </span>
          <span className="inline-flex items-center gap-1" title="Reactions">
            <Heart className="h-3 w-3" />
            {post._count?.reactions ?? 0}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 flex-shrink-0">
        <IconBtn
          label={post.featured ? 'Remove from featured' : 'Mark as featured'}
          tone={post.featured ? 'primary' : 'neutral'}
          onClick={onToggleFeatured}
        >
          {post.featured ? <Star className="h-3.5 w-3.5 fill-current" /> : <Star className="h-3.5 w-3.5" />}
        </IconBtn>
        <IconBtn
          label={post.published ? 'Unpublish' : 'Publish'}
          tone={post.published ? 'success' : 'neutral'}
          onClick={onTogglePublish}
        >
          <Globe className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn label="Edit" tone="neutral" onClick={onEdit}>
          <Edit3 className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn label="Delete" tone="error" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone: 'neutral' | 'success' | 'error' | 'primary';
}) {
  const toneCls = {
    neutral: 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground',
    success: 'bg-success/15 hover:bg-success/25 text-success',
    error: 'bg-error/15 hover:bg-error/25 text-error',
    primary: 'bg-primary/15 hover:bg-primary/25 text-primary',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-md transition-colors ${toneCls}`}
    >
      {children}
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="h-4 w-4 rounded bg-white/10" />
          <div className="h-20 w-28 sm:h-24 sm:w-36 rounded-lg bg-white/10 flex-shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-white/5 animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  filter,
  hasSearch,
  onNew,
}: {
  filter: FilterTab;
  hasSearch: boolean;
  onNew: () => void;
}) {
  const { title, description, showCta } = (() => {
    if (hasSearch) {
      return {
        title: 'No posts match your search',
        description: 'Try a different keyword, tag, or author.',
        showCta: false,
      };
    }
    switch (filter) {
      case 'published':
        return { title: 'No published posts yet', description: 'Publish a draft to see it here.', showCta: false };
      case 'draft':
        return { title: 'No drafts', description: 'All your posts are live.', showCta: false };
      case 'featured':
        return {
          title: 'Nothing featured',
          description: 'Mark posts as featured to curate the reading list.',
          showCta: false,
        };
      default:
        return {
          title: 'Start your blog',
          description: 'Write your first post and publish it to the community.',
          showCta: true,
        };
    }
  })();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
      <div className="p-3 rounded-full bg-primary/10 border border-primary/20 mb-4">
        <BookOpen className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      {showCta && (
        <button
          type="button"
          onClick={onNew}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Create your first post
        </button>
      )}
    </div>
  );
}
