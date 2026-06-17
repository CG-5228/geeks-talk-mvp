import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/blog/tags — returns every tag with post count, sorted desc
export async function GET() {
  const posts = await db.blogPost.findMany({
    where: { published: true },
    select: { tags: true },
  });

  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const tag of p.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const tags = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return NextResponse.json({ tags });
}
