'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';
import Link from 'next/link';

interface Author {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}

interface CommentSectionProps {
  slug: string;
}

export default function CommentSection({ slug }: CommentSectionProps) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/blog/${slug}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/blog/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      const data = await response.json();
      setComments((prev) => [...prev, data.comment]);
      setNewComment('');
    } catch (err: any) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-[rgba(236,245,255,0.95)] mb-6">
        <MessageSquare className="w-5 h-5" />
        Comments ({comments.length})
      </h2>

      {/* Comment Form */}
      {status === 'loading' ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : session ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'You'}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-3 bg-[color:var(--card-bg)]/60 border border-[color:var(--card-ring)]/30 rounded-lg text-[rgba(220,235,255,0.9)] placeholder:text-[rgba(220,235,255,0.4)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-[rgba(220,235,255,0.5)]">
                  {newComment.length}/2000
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Post
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-[color:var(--card-bg)]/60 border border-[color:var(--card-ring)]/30 rounded-lg text-center">
          <p className="text-[rgba(220,235,255,0.7)]">
            <Link href="/signin" className="text-primary hover:underline">
              Sign in
            </Link>{' '}
            to leave a comment
          </p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[rgba(220,235,255,0.6)]">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-4 bg-[color:var(--card-bg)]/40 border border-[color:var(--card-ring)]/20 rounded-lg"
            >
              {comment.author.image ? (
                <img
                  src={comment.author.image}
                  alt={comment.author.name || 'User'}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-sm font-medium">
                    {(comment.author.name || comment.author.username || 'A')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-[rgba(236,245,255,0.95)]">
                    {comment.author.name || comment.author.username || 'Anonymous'}
                  </span>
                  <span className="text-xs text-[rgba(220,235,255,0.5)]">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-[rgba(220,235,255,0.85)] whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
