'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import PostCard from './PostCard';

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  createdAt: string;
  author: Author;
  _count: {
    comments: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPosts = async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/blog?page=${page}&limit=9`);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(data.posts || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError('Failed to load blog posts. Please try again later.');
      console.error('Error fetching blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(currentPage);
  }, [currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasMore) {
      setCurrentPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-[rgba(220,235,255,0.7)]">Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => fetchPosts(currentPage)}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-xl font-semibold text-[rgba(236,245,255,0.95)]">
          No posts yet
        </h2>
        <p className="mt-2 text-[rgba(220,235,255,0.7)]">
          Check back soon for new articles and updates.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            title={post.title}
            slug={post.slug}
            excerpt={post.excerpt}
            coverImage={post.coverImage}
            publishedAt={post.publishedAt}
            author={post.author}
            commentCount={post._count.comments}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[color:var(--card-bg)]/60 border border-[color:var(--card-ring)]/30 text-[rgba(220,235,255,0.85)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[color:var(--card-bg)]/80 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-[rgba(220,235,255,0.7)]">
            Page {currentPage} of {pagination.totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={!pagination.hasMore}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[color:var(--card-bg)]/60 border border-[color:var(--card-ring)]/30 text-[rgba(220,235,255,0.85)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[color:var(--card-bg)]/80 transition"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Total count */}
      {pagination && (
        <p className="mt-4 text-center text-sm text-[rgba(220,235,255,0.5)]">
          Showing {posts.length} of {pagination.total} posts
        </p>
      )}
    </div>
  );
}
