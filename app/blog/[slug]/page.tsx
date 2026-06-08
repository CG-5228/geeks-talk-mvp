import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Eye, MessageSquare } from 'lucide-react';
import { db } from '@/lib/db';
import PostContent from '@/components/blog/PostContent';
import CommentSection from '@/components/blog/CommentSection';
import ReadingProgressBar from '@/components/blog/ReadingProgressBar';
import TableOfContents from '@/components/blog/TableOfContents';
import ShareButtons from '@/components/blog/ShareButtons';
import ReactionsBar from '@/components/blog/ReactionsBar';
import RelatedPosts from '@/components/blog/RelatedPosts';
import ViewTracker from '@/components/blog/ViewTracker';
import AuthorCard from '@/components/blog/AuthorCard';
import PrevNextNav from '@/components/blog/PrevNextNav';
import ParticlesBackgroundClient from '@/components/auth/ParticlesBackgroundClient';
import { extractTableOfContents } from '@/lib/blog/tableOfContents';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://geekstalk.org';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const post = await db.blogPost.findUnique({
    where: { slug: params.slug, published: true },
    select: {
      title: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      updatedAt: true,
      tags: true,
      author: { select: { name: true } },
    },
  });

  if (!post) return { title: 'Post Not Found • Geeks Talk' };

  const canonical = `${SITE_URL}/blog/${params.slug}`;
  return {
    title: `${post.title} • Geeks Talk Blog`,
    description: post.excerpt || `Read ${post.title} on the Geeks Talk blog`,
    keywords: post.tags,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      url: canonical,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: post.author?.name ? [post.author.name] : undefined,
      images: post.coverImage ? [post.coverImage] : undefined,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || undefined,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage(props: Props) {
  const params = await props.params;

  const post = await db.blogPost.findUnique({
    where: { slug: params.slug },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, bio: true },
      },
      _count: { select: { comments: true, reactions: true } },
    },
  });

  if (!post || !post.published) notFound();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const [prev, next, reactionGroups, myReactions] = await Promise.all([
    db.blogPost.findFirst({
      where: { published: true, publishedAt: { lt: post.publishedAt ?? post.createdAt } },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true },
    }),
    db.blogPost.findFirst({
      where: { published: true, publishedAt: { gt: post.publishedAt ?? post.createdAt } },
      orderBy: { publishedAt: 'asc' },
      select: { slug: true, title: true },
    }),
    db.blogReaction.groupBy({
      by: ['type'],
      where: { postId: post.id },
      _count: { type: true },
    }),
    userId
      ? db.blogReaction.findMany({
          where: { postId: post.id, userId },
          select: { type: true },
        })
      : Promise.resolve([]),
  ]);

  const reactionCounts = reactionGroups.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = row._count.type;
    return acc;
  }, {});

  const toc = extractTableOfContents(post.content);
  const canonical = `${SITE_URL}/blog/${params.slug}`;

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="relative min-h-screen">
      <ReadingProgressBar />
      <ViewTracker slug={params.slug} />

      <ParticlesBackgroundClient density={25} zIndex={0} />
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        <div className="absolute inset-0 opacity-[0.3] bg-[radial-gradient(60%_40%_at_50%_0%,rgba(0,220,255,0.15),transparent_60%)]" />
      </div>

      <main className="relative z-[2]">
        <article className="px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <div className="max-w-6xl mx-auto">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-[rgba(220,235,255,0.7)] hover:text-[color:hsl(var(--primary))] transition mb-8"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>

            <header className="max-w-3xl mx-auto">
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {post.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/blog?tag=${encodeURIComponent(t)}`}
                      className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[color:hsl(var(--primary)/0.12)] text-[color:hsl(var(--primary))] border border-[color:hsl(var(--primary)/0.25)] hover:bg-[color:hsl(var(--primary)/0.2)] transition"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[rgba(236,245,255,0.98)] leading-[1.1] tracking-tight">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="mt-5 text-lg sm:text-xl text-[rgba(220,235,255,0.78)] leading-relaxed">
                  {post.excerpt}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-4 gap-y-3 text-sm text-[rgba(220,235,255,0.65)]">
                <div className="flex items-center gap-2">
                  {post.author.image ? (
                    <Image
                      src={post.author.image}
                      alt={post.author.name || 'Author'}
                      width={32}
                      height={32}
                      className="rounded-full ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[color:hsl(var(--primary)/0.2)] grid place-items-center text-[color:hsl(var(--primary))] text-sm font-semibold">
                      {(post.author.name || 'A')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-[rgba(236,245,255,0.9)]">
                    {post.author.name || post.author.username || 'Anonymous'}
                  </span>
                </div>
                <span className="text-[rgba(220,235,255,0.3)]">•</span>
                {formattedDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> {formattedDate}
                  </span>
                )}
                <span className="text-[rgba(220,235,255,0.3)]">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> {post.readingTimeMinutes} min read
                </span>
                <span className="text-[rgba(220,235,255,0.3)]">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> {post.viewCount.toLocaleString()} views
                </span>
                <span className="text-[rgba(220,235,255,0.3)]">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> {post._count.comments}
                </span>
              </div>
            </header>

            {post.coverImage && (
              <div className="mt-10 max-w-5xl mx-auto">
                <div className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_30px_80px_-20px_rgba(0,200,255,0.25)]">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    sizes="(max-width: 1200px) 100vw, 1100px"
                    className="object-cover"
                    priority
                    unoptimized
                  />
                </div>
              </div>
            )}

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-10 lg:gap-12">
              <div className="min-w-0 max-w-3xl lg:max-w-none lg:w-full mx-auto lg:mx-0">
                <PostContent content={post.content} />

                <div className="mt-14 rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/50 backdrop-blur-xl p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.55)]">
                        Enjoyed this piece?
                      </div>
                      <div className="mt-1 text-sm text-[rgba(236,245,255,0.9)]">
                        Let the author know how it landed.
                      </div>
                    </div>
                    <ShareButtons title={post.title} url={canonical} />
                  </div>
                  <div className="mt-5">
                    <ReactionsBar
                      slug={params.slug}
                      initialCounts={reactionCounts}
                      initialMine={myReactions.map((r) => r.type)}
                    />
                  </div>
                </div>

                <div className="mt-10">
                  <AuthorCard author={post.author} />
                </div>

                <div className="mt-12">
                  <PrevNextNav prev={prev} next={next} />
                </div>
              </div>

              {toc.length > 0 && (
                <aside className="hidden lg:block">
                  <div className="sticky top-24 space-y-6">
                    <TableOfContents entries={toc} />
                    <div className="rounded-xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl p-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.6)]">
                        Share
                      </div>
                      <div className="mt-3">
                        <ShareButtons title={post.title} url={canonical} />
                      </div>
                    </div>
                  </div>
                </aside>
              )}
            </div>

            <section className="mt-20 max-w-6xl mx-auto">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-2xl font-bold text-[rgba(236,245,255,0.98)] tracking-tight">
                  Keep reading
                </h2>
                <Link
                  href="/blog"
                  className="text-sm text-[rgba(220,235,255,0.7)] hover:text-[color:hsl(var(--primary))] transition"
                >
                  All articles →
                </Link>
              </div>
              <RelatedPosts slug={params.slug} />
            </section>

            <section className="mt-16 max-w-3xl mx-auto">
              <hr className="border-white/[0.06] mb-10" />
              <CommentSection slug={params.slug} />
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}
