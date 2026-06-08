'use client';

import { useEffect, useState } from 'react';
import PostCard, { type PostCardData } from './PostCard';

interface Props {
  slug: string;
}

interface ApiItem extends PostCardData {
  id: string;
}

export default function RelatedPosts({ slug }: Props) {
  const [items, setItems] = useState<ApiItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/blog/${encodeURIComponent(slug)}/related`)
      .then((r) => (r.ok ? r.json() : { related: [] }))
      .then((d) => {
        if (!cancelled) setItems(d.related || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (items === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.05] bg-[color:var(--card-bg)]/40 overflow-hidden animate-pulse"
          >
            <div className="aspect-[16/9] bg-white/[0.05]" />
            <div className="p-5 space-y-2">
              <div className="h-4 w-4/5 bg-white/[0.08] rounded" />
              <div className="h-4 w-3/5 bg-white/[0.06] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {items.map((p) => (
        <PostCard key={p.slug} {...p} />
      ))}
    </div>
  );
}
