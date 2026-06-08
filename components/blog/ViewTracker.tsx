'use client';

import { useEffect } from 'react';

interface Props {
  slug: string;
}

export default function ViewTracker({ slug }: Props) {
  useEffect(() => {
    const key = `blog-viewed:${slug}`;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    const t = setTimeout(() => {
      fetch(`/api/blog/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [slug]);

  return null;
}
