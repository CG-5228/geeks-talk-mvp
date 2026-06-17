export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractTableOfContents(markdown: string): TocEntry[] {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const entries: TocEntry[] = [];
  let inCodeBlock = false;
  const slugCounts = new Map<string, number>();

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{2,4})\s+(.+)$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim();
    const base = slugify(text);
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;
    entries.push({ id, text, level });
  }

  return entries;
}
