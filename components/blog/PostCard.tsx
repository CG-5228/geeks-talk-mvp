'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MessageSquare, User } from 'lucide-react';

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface PostCardProps {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  author: Author;
  commentCount: number;
}

export default function PostCard({
  title,
  slug,
  excerpt,
  coverImage,
  publishedAt,
  author,
  commentCount,
}: PostCardProps) {
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Link
      href={`/blog/${slug}`}
      className="group block rounded-xl overflow-hidden bg-[color:var(--card-bg)]/60 backdrop-blur-xl border border-[color:var(--card-ring)]/30 hover:border-[color:var(--card-ring)]/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl opacity-30">📝</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h2 className="text-lg font-semibold text-[rgba(236,245,255,0.95)] group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h2>

        {excerpt && (
          <p className="mt-2 text-sm text-[rgba(220,235,255,0.7)] line-clamp-3">
            {excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 text-xs text-[rgba(220,235,255,0.6)]">
          {/* Author */}
          <div className="flex items-center gap-1.5">
            {author.image ? (
              <Image
                src={author.image}
                alt={author.name || 'Author'}
                width={20}
                height={20}
                className="rounded-full"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span>{author.name || 'Anonymous'}</span>
          </div>

          {/* Date */}
          {formattedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          )}

          {/* Comments */}
          <div className="flex items-center gap-1 ml-auto">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{commentCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
