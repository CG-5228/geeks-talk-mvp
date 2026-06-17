import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://geekstalk.org';

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await db.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    take: 30,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
      createdAt: true,
      author: { select: { name: true } },
      tags: true,
    },
  });

  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const pub = (p.publishedAt || p.createdAt).toUTCString();
      const author = p.author?.name || 'Geeks Talk';
      const categories = p.tags
        .map((t) => `      <category>${xmlEscape(t)}</category>`)
        .join('\n');
      return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      <pubDate>${pub}</pubDate>
      <dc:creator>${xmlEscape(author)}</dc:creator>
      <description>${xmlEscape(p.excerpt || '')}</description>
${categories}
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Geeks Talk Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Articles, tutorials, and updates from the Geeks Talk community.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/api/blog/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
