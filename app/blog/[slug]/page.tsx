import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import PostContent from '@/components/blog/PostContent';
import CommentSection from '@/components/blog/CommentSection';

const LazyParticles = dynamic(() => import('@/components/auth/ParticlesBackground'), {
  ssr: false,
});

interface Props {
  params: { slug: string };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await db.blogPost.findUnique({
    where: { slug: params.slug, published: true },
    select: { title: true, excerpt: true, coverImage: true },
  });

  if (!post) {
    return {
      title: 'Post Not Found • Geeks Talk',
    };
  }

  return {
    title: `${post.title} • Geeks Talk Blog`,
    description: post.excerpt || `Read ${post.title} on Geeks Talk Blog`,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: post.coverImage ? [post.coverImage] : undefined,
      type: 'article',
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await db.blogPost.findUnique({
    where: { slug: params.slug },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    },
  });

  // 404 if post doesn't exist or isn't published
  if (!post || !post.published) {
    notFound();
  }

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="relative min-h-screen">
      {/* Background particles */}
      <LazyParticles density={30} zIndex={0} />

      {/* Radial overlay */}
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(60%_40%_at_50%_10%,rgba(255,255,255,0.12),transparent_60%)]" />
      </div>

      <main className="relative z-[2]">
        <article className="px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="max-w-3xl mx-auto">
            {/* Back link */}
            <a
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-[rgba(220,235,255,0.7)] hover:text-primary transition mb-8"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Blog
            </a>

            {/* Cover Image */}
            {post.coverImage && (
              <div className="relative aspect-[2/1] rounded-xl overflow-hidden mb-8">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Header */}
            <header className="mb-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[rgba(236,245,255,0.98)] leading-tight">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="mt-4 text-xl text-[rgba(220,235,255,0.7)] leading-relaxed">
                  {post.excerpt}
                </p>
              )}

              {/* Meta */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[rgba(220,235,255,0.6)]">
                {/* Author */}
                <div className="flex items-center gap-2">
                  {post.author.image ? (
                    <img
                      src={post.author.image}
                      alt={post.author.name || 'Author'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary text-sm font-medium">
                        {(post.author.name || 'A')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-[rgba(220,235,255,0.85)]">
                    {post.author.name || post.author.username || 'Anonymous'}
                  </span>
                </div>

                {/* Separator */}
                <span className="text-[rgba(220,235,255,0.3)]">•</span>

                {/* Date */}
                {formattedDate && <span>{formattedDate}</span>}

                {/* Separator */}
                <span className="text-[rgba(220,235,255,0.3)]">•</span>

                {/* Comments count */}
                <span>{post._count.comments} comments</span>
              </div>
            </header>

            {/* Content */}
            <PostContent content={post.content} />

            {/* Divider */}
            <hr className="my-12 border-[color:var(--card-ring)]/20" />

            {/* Comments */}
            <CommentSection slug={params.slug} />
          </div>
        </article>
      </main>
    </div>
  );
}
