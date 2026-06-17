import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/blog/[slug]/related
// Returns up to 3 posts scored by shared tags, falling back to same author,
// then latest. Excludes the source post itself.
export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const source = await db.blogPost.findUnique({
    where: { slug: params.slug, published: true },
    select: { id: true, tags: true, authorId: true },
  });
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const selector = {
    id: true,
    title: true,
    slug: true,
    excerpt: true,
    coverImage: true,
    tags: true,
    readingTimeMinutes: true,
    publishedAt: true,
    author: { select: { id: true, name: true, username: true, image: true } },
  };

  const byTag = source.tags.length
    ? await db.blogPost.findMany({
        where: {
          published: true,
          id: { not: source.id },
          tags: { hasSome: source.tags },
        },
        orderBy: { publishedAt: 'desc' },
        take: 6,
        select: selector,
      })
    : [];

  // Score by shared-tag count desc
  const scored = byTag
    .map((p) => ({
      post: p,
      score: p.tags.filter((t) => source.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.post)
    .slice(0, 3);

  if (scored.length >= 3) return NextResponse.json({ related: scored });

  // Backfill with same-author posts, then latest overall
  const excludeIds = new Set([source.id, ...scored.map((p) => p.id)]);
  const needed = 3 - scored.length;
  const extras = await db.blogPost.findMany({
    where: {
      published: true,
      id: { notIn: Array.from(excludeIds) },
      OR: [{ authorId: source.authorId }, {}],
    },
    orderBy: [{ authorId: 'desc' }, { publishedAt: 'desc' }],
    take: needed,
    select: selector,
  });

  return NextResponse.json({ related: [...scored, ...extras] });
}
