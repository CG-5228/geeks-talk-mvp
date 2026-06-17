'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { FileText, MessageSquare, Heart, ThumbsUp } from 'lucide-react';

type Item = {
  id: string;
  kind: 'post' | 'comment' | 'reaction' | 'like-received';
  createdAt: string;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Record<string, unknown>;
};

const ICON: Record<Item['kind'], React.ComponentType<{ className?: string }>> = {
  post: FileText,
  comment: MessageSquare,
  reaction: Heart,
  'like-received': ThumbsUp,
};

export default function ActivityFeed({ username }: { username?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (nextCursor: string | null) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (username) params.set('username', username);
        if (nextCursor) params.set('cursor', nextCursor);
        params.set('limit', '20');
        const r = await fetch(`/api/user/activity?${params.toString()}`);
        const d = await r.json();
        if (Array.isArray(d.items)) {
          setItems((prev) => (nextCursor ? [...prev, ...d.items] : d.items));
          setCursor(d.nextCursor);
          setHasMore(Boolean(d.nextCursor));
        }
      } finally {
        setLoading(false);
      }
    },
    [username],
  );

  useEffect(() => {
    load(null);
  }, [load]);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/20 bg-card/30 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const Icon = ICON[it.kind];
        const content = (
          <div className="flex gap-3 p-4 rounded-xl border border-border/20 bg-card/30 hover:bg-card/40 transition">
            <div className="flex-shrink-0 mt-0.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate">{it.title}</div>
              {it.body && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{it.body}</p>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(it.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        );
        return it.href ? (
          <Link key={it.id} href={it.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={it.id}>{content}</div>
        );
      })}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => load(cursor)}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border/30 text-sm text-foreground hover:bg-card/40 transition disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
