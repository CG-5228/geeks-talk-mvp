import type { Metadata } from 'next';
import BlogList from '@/components/blog/BlogList';
import ParticlesBackgroundClient from '@/components/auth/ParticlesBackgroundClient';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Blog • Geeks Talk',
  description:
    'Deep-dive articles, tutorials, and field notes from the Geeks Talk community on programming, engineering, and building on the web.',
  alternates: {
    canonical: 'https://geekstalk.org/blog',
    types: { 'application/rss+xml': 'https://geekstalk.org/api/blog/rss' },
  },
  openGraph: {
    title: 'Blog • Geeks Talk',
    description:
      'Deep-dive articles, tutorials, and field notes from the Geeks Talk community.',
    url: 'https://geekstalk.org/blog',
    type: 'website',
  },
};

async function getStats() {
  try {
    const [total, tagRows] = await Promise.all([
      db.blogPost.count({ where: { published: true } }),
      db.blogPost.findMany({ where: { published: true }, select: { tags: true } }),
    ]);
    const tagSet = new Set<string>();
    for (const p of tagRows) for (const t of p.tags) tagSet.add(t);
    return { total, tagCount: tagSet.size };
  } catch {
    return { total: 0, tagCount: 0 };
  }
}

export default async function BlogPage() {
  const stats = await getStats();

  return (
    <div className="relative min-h-screen">
      <ParticlesBackgroundClient density={50} zIndex={0} />

      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        <div className="absolute inset-0 opacity-[0.4] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(0,220,255,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.25] bg-[radial-gradient(50%_30%_at_15%_25%,rgba(180,120,255,0.15),transparent_60%)]" />
      </div>

      <main className="relative z-[2]">
        {/* Hero */}
        <section className="px-4 sm:px-6 lg:px-8 pt-20 pb-8 sm:pt-28 sm:pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:hsl(var(--primary)/0.12)] border border-[color:hsl(var(--primary)/0.3)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[color:hsl(var(--primary))] opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:hsl(var(--primary))]" />
                </span>
                The Journal
              </span>

              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[rgba(236,245,255,0.98)] leading-[1.05]">
                Ideas worth
                <br />
                <span className="bg-gradient-to-r from-[color:hsl(var(--primary))] via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  thinking about.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-lg text-[rgba(220,235,255,0.8)] leading-relaxed">
                In-depth articles, tutorials, and engineering notes from the people building Geeks Talk.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[rgba(220,235,255,0.7)]">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white tabular-nums">{stats.total}</span>
                  <span>Articles</span>
                </div>
                <span className="opacity-20">•</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white tabular-nums">{stats.tagCount}</span>
                  <span>Topics</span>
                </div>
                <span className="opacity-20">•</span>
                <a
                  href="/api/blog/rss"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[rgba(220,235,255,0.85)] hover:text-[color:hsl(var(--primary))] underline underline-offset-4 decoration-dotted transition"
                >
                  Subscribe via RSS
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pb-24">
          <div className="max-w-6xl mx-auto">
            <BlogList />
          </div>
        </section>
      </main>
    </div>
  );
}
