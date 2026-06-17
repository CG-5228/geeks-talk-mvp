'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, MessageSquare, User } from 'lucide-react';

interface Author {
  id: string;
  name: string | null;
  username?: string | null;
  image: string | null;
}

export interface PostCardData {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  tags?: string[];
  viewCount?: number;
  readingTimeMinutes?: number;
  featured?: boolean;
  author: Author;
  commentCount?: number;
  reactionCount?: number;
}

interface PostCardProps extends PostCardData {
  variant?: 'default' | 'feature' | 'compact';
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

const formatCount = (n?: number) => {
  if (!n) return '0';
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
};

export default function PostCard(props: PostCardProps) {
  const {
    title,
    slug,
    excerpt,
    coverImage,
    publishedAt,
    tags = [],
    viewCount = 0,
    readingTimeMinutes = 1,
    featured,
    author,
    commentCount = 0,
    variant = 'default',
  } = props;

  const date = formatDate(publishedAt);
  const primaryTag = tags[0];

  if (variant === 'compact') {
    return (
      <Link
        href={`/blog/${slug}`}
        className="group flex gap-4 p-3 rounded-xl hover:bg-white/[0.04] transition-colors"
      >
        <div className="relative h-20 w-28 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[color:hsl(var(--primary)/0.25)] to-[color:hsl(var(--primary)/0.05)]">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={title}
              fill
              sizes="112px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-2xl opacity-40">✦</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {primaryTag && (
            <span className="inline-block text-[10px] uppercase tracking-widest font-semibold text-[color:hsl(var(--primary))]">
              {primaryTag}
            </span>
          )}
          <h3 className="text-sm font-semibold text-[rgba(236,245,255,0.95)] line-clamp-2 group-hover:text-[color:hsl(var(--primary))] transition-colors">
            {title}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[rgba(220,235,255,0.55)]">
            <span>{date}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {readingTimeMinutes} min
            </span>
          </div>
        </div>
      </Link>
    );
  }

  const isFeature = variant === 'feature';

  return (
    <Link
      href={`/blog/${slug}`}
      className={[
        'group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300',
        'bg-[color:var(--card-bg)]/60 backdrop-blur-xl',
        'border-white/[0.06] hover:border-[color:hsl(var(--primary)/0.35)]',
        'hover:shadow-[0_20px_60px_-20px_rgba(0,220,255,0.25)]',
        isFeature ? 'md:flex-row md:col-span-2' : '',
      ].join(' ')}
    >
      <div
        className={[
          'relative overflow-hidden bg-gradient-to-br from-[color:hsl(var(--primary)/0.2)] via-[color:hsl(var(--primary)/0.05)] to-transparent',
          isFeature ? 'md:w-[55%] aspect-[16/10] md:aspect-auto' : 'aspect-[16/9]',
        ].join(' ')}
      >
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes={isFeature ? '(max-width: 768px) 100vw, 55vw' : '(max-width: 768px) 100vw, 33vw'}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-5xl opacity-30 tracking-widest">✦ ✦ ✦</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {featured && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-[color:hsl(var(--primary))] text-[color:hsl(var(--primary-foreground))] shadow-lg">
            ★ Featured
          </span>
        )}
      </div>

      <div className={['flex flex-col p-5 md:p-6', isFeature ? 'md:w-[45%] md:justify-between' : ''].join(' ')}>
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[color:hsl(var(--primary)/0.12)] text-[color:hsl(var(--primary))] border border-[color:hsl(var(--primary)/0.2)]"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <h2
          className={[
            'font-bold text-[rgba(236,245,255,0.98)] group-hover:text-[color:hsl(var(--primary))] transition-colors leading-tight',
            isFeature ? 'text-2xl md:text-3xl line-clamp-3' : 'text-lg line-clamp-2',
          ].join(' ')}
        >
          {title}
        </h2>

        {excerpt && (
          <p
            className={[
              'mt-3 text-[rgba(220,235,255,0.7)] leading-relaxed',
              isFeature ? 'text-base line-clamp-3' : 'text-sm line-clamp-3',
            ].join(' ')}
          >
            {excerpt}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3 text-xs text-[rgba(220,235,255,0.6)]">
          {author.image ? (
            <Image
              src={author.image}
              alt={author.name || 'Author'}
              width={24}
              height={24}
              className="rounded-full ring-1 ring-white/10"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[color:hsl(var(--primary)/0.2)] grid place-items-center">
              <User className="w-3.5 h-3.5 text-[color:hsl(var(--primary))]" />
            </div>
          )}
          <span className="font-medium text-[rgba(236,245,255,0.85)]">{author.name || 'Anonymous'}</span>
          <span className="text-[rgba(220,235,255,0.3)]">•</span>
          <span>{date}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-4 text-xs text-[rgba(220,235,255,0.55)]">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {readingTimeMinutes} min read
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {formatCount(viewCount)}
          </span>
          <span className="inline-flex items-center gap-1 ml-auto">
            <MessageSquare className="w-3.5 h-3.5" /> {commentCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
