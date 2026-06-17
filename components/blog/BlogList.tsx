'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Rss, Search, SlidersHorizontal, X } from 'lucide-react';
import PostCard, { type PostCardData } from './PostCard';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface ApiPost extends PostCardData {
  id: string;
  _count?: { comments: number; reactions: number };
}

interface ApiResponse {
  posts: ApiPost[];
  featured: ApiPost[];
  pagination: Pagination;
}

interface TagItem {
  name: string;
  count: number;
}

function SkeletonCard({ feature = false }: { feature?: boolean }) {
  return (
    <div
      className={[
        'rounded-2xl border border-white/[0.05] bg-[color:var(--card-bg)]/40 overflow-hidden animate-pulse',
        feature ? 'md:col-span-2 md:flex' : '',
      ].join(' ')}
    >
      <div className={feature ? 'md:w-[55%] aspect-[16/10] md:aspect-auto bg-white/[0.05]' : 'aspect-[16/9] bg-white/[0.05]'} />
      <div className={['p-5 md:p-6 flex-1', feature ? 'md:w-[45%]' : ''].join(' ')}>
        <div className="h-3 w-20 rounded-full bg-white/[0.08]" />
        <div className="mt-3 h-5 w-4/5 rounded bg-white/[0.08]" />
        <div className="mt-2 h-5 w-3/5 rounded bg-white/[0.06]" />
        <div className="mt-4 space-y-2">
          <div className="h-3 rounded bg-white/[0.05]" />
          <div className="h-3 w-5/6 rounded bg-white/[0.05]" />
        </div>
        <div className="mt-5 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/[0.08]" />
          <div className="h-3 w-24 rounded bg-white/[0.05]" />
        </div>
      </div>
    </div>
  );
}

export default function BlogList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const urlTag = searchParams.get('tag') || '';
  const urlQuery = searchParams.get('q') || '';
  const urlSort = (searchParams.get('sort') || 'recent') as 'recent' | 'popular';

  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [featuredRow, setFeaturedRow] = useState<ApiPost[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const updateUrl = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '' || v === null) next.delete(k);
        else next.set(k, String(v));
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Sync debounced query to URL
  useEffect(() => {
    if (debouncedQuery === urlQuery) return;
    updateUrl({ q: debouncedQuery || undefined, page: undefined });
  }, [debouncedQuery, urlQuery, updateUrl]);

  // Fetch tags once
  useEffect(() => {
    fetch('/api/blog/tags')
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((d) => setTags(d.tags || []))
      .catch(() => setTags([]));
  }, []);

  // Fetch posts whenever filters change
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    setLoading(true);
    setError(null);

    const sp = new URLSearchParams({
      page: String(urlPage),
      limit: '9',
      sort: urlSort,
    });
    if (urlTag) sp.set('tag', urlTag);
    if (urlQuery) sp.set('q', urlQuery);

    fetch(`/api/blog?${sp.toString()}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed'))))
      .then((d: ApiResponse) => {
        setPosts(d.posts || []);
        setFeaturedRow(d.featured || []);
        setPagination(d.pagination || null);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError('Failed to load posts.');
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });

    return () => ctl.abort();
  }, [urlPage, urlTag, urlQuery, urlSort]);

  const setTag = (tag: string | '') => updateUrl({ tag: tag || undefined, page: undefined });
  const setSort = (sort: 'recent' | 'popular') =>
    updateUrl({ sort: sort === 'recent' ? undefined : sort, page: undefined });
  const setPage = (p: number) => {
    updateUrl({ page: p === 1 ? undefined : p });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterCount = (urlTag ? 1 : 0) + (urlQuery ? 1 : 0) + (urlSort !== 'recent' ? 1 : 0);

  const normalized = useMemo(
    () =>
      posts.map((p) => ({
        ...p,
        commentCount: p.commentCount ?? p._count?.comments ?? 0,
        reactionCount: p.reactionCount ?? p._count?.reactions ?? 0,
      })),
    [posts]
  );

  const showFeatureRow = featuredRow.length > 0 && urlPage === 1 && !urlQuery && !urlTag;

  return (
    <div>
      {/* Filter bar */}
      <div className="sticky top-16 z-20 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="rounded-2xl bg-[color:var(--nav-bg)]/70 backdrop-blur-xl border border-white/[0.06] shadow-lg shadow-black/20 p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.5)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles by title, excerpt, or content…"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.4)] focus:outline-none focus:ring-2 focus:ring-[color:hsl(var(--primary)/0.4)] focus:border-transparent transition"
                aria-label="Search blog"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 text-[rgba(220,235,255,0.6)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-xl bg-white/[0.04] border border-white/[0.06] p-0.5 text-xs">
                <button
                  onClick={() => setSort('recent')}
                  className={[
                    'px-3 py-1.5 rounded-lg font-medium transition',
                    urlSort === 'recent'
                      ? 'bg-white/10 text-[rgba(236,245,255,0.95)]'
                      : 'text-[rgba(220,235,255,0.6)] hover:text-white',
                  ].join(' ')}
                >
                  Recent
                </button>
                <button
                  onClick={() => setSort('popular')}
                  className={[
                    'px-3 py-1.5 rounded-lg font-medium transition',
                    urlSort === 'popular'
                      ? 'bg-white/10 text-[rgba(236,245,255,0.95)]'
                      : 'text-[rgba(220,235,255,0.6)] hover:text-white',
                  ].join(' ')}
                >
                  Popular
                </button>
              </div>

              <a
                href="/api/blog/rss"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-[rgba(220,235,255,0.8)] hover:bg-white/[0.08] hover:text-white transition"
              >
                <Rss className="w-3.5 h-3.5" /> RSS
              </a>
            </div>
          </div>

          {/* Tag rail */}
          {tags.length > 0 && (
            <div className="mt-3 -mx-1 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 px-1 min-w-min">
                <button
                  onClick={() => setTag('')}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition border',
                    !urlTag
                      ? 'bg-[color:hsl(var(--primary))] text-[color:hsl(var(--primary-foreground))] border-transparent'
                      : 'bg-white/[0.04] text-[rgba(220,235,255,0.7)] border-white/[0.06] hover:border-[color:hsl(var(--primary)/0.4)]',
                  ].join(' ')}
                >
                  All
                </button>
                {tags.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setTag(t.name)}
                    className={[
                      'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition border',
                      urlTag === t.name
                        ? 'bg-[color:hsl(var(--primary))] text-[color:hsl(var(--primary-foreground))] border-transparent'
                        : 'bg-white/[0.04] text-[rgba(220,235,255,0.7)] border-white/[0.06] hover:border-[color:hsl(var(--primary)/0.4)]',
                    ].join(' ')}
                  >
                    {t.name} <span className="opacity-60 ml-0.5">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeFilterCount > 0 && (
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[rgba(220,235,255,0.7)]">
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {pagination?.total ?? 0} {pagination?.total === 1 ? 'result' : 'results'}
                {urlQuery && <span className="ml-1 opacity-70">for “{urlQuery}”</span>}
                {urlTag && <span className="ml-1 opacity-70">in #{urlTag}</span>}
              </span>
              <button
                onClick={() => {
                  setQuery('');
                  updateUrl({ q: undefined, tag: undefined, sort: undefined, page: undefined });
                }}
                className="text-[rgba(220,235,255,0.8)] hover:text-white underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {error ? (
          <div className="text-center py-20">
            <p className="text-red-400">{error}</p>
          </div>
        ) : loading && posts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard feature />
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : normalized.length === 0 ? (
          <div className="text-center py-24">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] grid place-items-center text-2xl mb-4">
              ∅
            </div>
            <h2 className="text-xl font-semibold text-[rgba(236,245,255,0.95)]">No posts match your filters</h2>
            <p className="mt-2 text-[rgba(220,235,255,0.7)]">Try different keywords or clear filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {showFeatureRow && featuredRow[0] && (
                <PostCard
                  key={featuredRow[0].slug}
                  {...featuredRow[0]}
                  commentCount={featuredRow[0]._count?.comments ?? 0}
                  variant="feature"
                />
              )}
              {normalized
                .filter((p) => !showFeatureRow || p.slug !== featuredRow[0]?.slug)
                .map((p) => (
                  <PostCard key={p.slug} {...p} />
                ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage(Math.max(1, urlPage - 1))}
                  disabled={urlPage === 1}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-[rgba(236,245,255,0.9)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.08] transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-sm text-[rgba(220,235,255,0.7)] tabular-nums">
                  Page <span className="text-white font-semibold">{urlPage}</span> of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(urlPage + 1)}
                  disabled={!pagination.hasMore}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-[rgba(236,245,255,0.9)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.08] transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
