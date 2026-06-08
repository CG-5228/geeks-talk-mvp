'use client';

interface PostContentProps {
  content: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(rawUrl: string): string | null {
  const normalized = rawUrl.trim().replace(/&amp;/g, '&');
  if (!normalized || /\s/.test(normalized)) {
    return null;
  }

  if (normalized.startsWith('#')) {
    return normalized;
  }

  if (normalized.startsWith('/') && !normalized.startsWith('//')) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return null;
}

// Simple markdown parser - converts common markdown patterns to HTML
function parseMarkdown(text: string): string {
  let html = escapeHtml(text);
  const slugCounts = new Map<string, number>();

  const headingRule = (level: number, classes: string) =>
    (_m: string, raw: string) => {
      const base = slugify(raw);
      const c = slugCounts.get(base) ?? 0;
      slugCounts.set(base, c + 1);
      const id = c === 0 ? base : `${base}-${c}`;
      return `<h${level} id="${id}" class="${classes} scroll-mt-24">${raw}</h${level}>`;
    };

  // Headers (h1-h6) with auto-generated ids for TOC deep-linking
  html = html.replace(/^###### (.*)$/gm, headingRule(6, 'text-sm font-semibold text-[rgba(236,245,255,0.95)] mt-8 mb-2'));
  html = html.replace(/^##### (.*)$/gm, headingRule(5, 'text-base font-semibold text-[rgba(236,245,255,0.95)] mt-8 mb-2'));
  html = html.replace(/^#### (.*)$/gm, headingRule(4, 'text-lg font-semibold text-[rgba(236,245,255,0.95)] mt-10 mb-3'));
  html = html.replace(/^### (.*)$/gm, headingRule(3, 'text-xl font-bold text-[rgba(236,245,255,0.95)] mt-10 mb-3 tracking-tight'));
  html = html.replace(/^## (.*)$/gm, headingRule(2, 'text-2xl md:text-3xl font-bold text-[rgba(236,245,255,0.98)] mt-14 mb-4 tracking-tight'));
  html = html.replace(/^# (.*)$/gm, headingRule(1, 'text-3xl md:text-4xl font-bold text-[rgba(236,245,255,0.98)] mt-14 mb-4 tracking-tight'));

  // Code blocks (triple backticks)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-[#0a0b12] border border-white/[0.06] rounded-xl p-5 overflow-x-auto my-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"><code class="text-[13px] leading-relaxed text-[rgba(220,235,255,0.9)] font-mono">$2</code></pre>'
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded text-[0.9em] text-[color:hsl(var(--primary))] font-mono border border-white/[0.05]">$1</code>'
  );

  // Bold / italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[rgba(236,245,255,0.98)]">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong class="font-semibold text-[rgba(236,245,255,0.98)]">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-[rgba(236,245,255,0.9)]">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em class="italic text-[rgba(236,245,255,0.9)]">$1</em>');

  // Images (as figures with captions)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, altText: string, rawUrl: string) => {
      const safeUrl = sanitizeUrl(rawUrl);
      if (!safeUrl) return '';
      return `<figure class="my-8"><img src="${escapeHtml(safeUrl)}" alt="${altText}" class="w-full rounded-xl border border-white/[0.06]" loading="lazy" />${altText ? `<figcaption class="mt-2 text-center text-sm text-[rgba(220,235,255,0.6)] italic">${altText}</figcaption>` : ''}</figure>`;
    }
  );

  // Links (external opens in new tab)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, rawUrl: string) => {
      const safeUrl = sanitizeUrl(rawUrl);
      if (!safeUrl) return label;
      const external = /^https?:\/\//i.test(safeUrl);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(safeUrl)}" class="text-[color:hsl(var(--primary))] underline underline-offset-4 decoration-[color:hsl(var(--primary)/0.4)] hover:decoration-[color:hsl(var(--primary))] transition"${attrs}>${label}</a>`;
    }
  );

  // Blockquotes
  html = html.replace(
    /^&gt; (.*)$/gm,
    '<blockquote class="border-l-[3px] border-[color:hsl(var(--primary))] pl-5 py-1 my-6 text-[rgba(220,235,255,0.85)] italic text-lg leading-relaxed">$1</blockquote>'
  );

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-white/[0.08] my-12" />');
  html = html.replace(/^\*\*\*$/gm, '<hr class="border-white/[0.08] my-12" />');

  // Lists
  html = html.replace(/^[\*\-] (.*)$/gm, '<li class="ml-5 pl-1 text-[rgba(220,235,255,0.88)] marker:text-[color:hsl(var(--primary))]">$1</li>');
  html = html.replace(/^\d+\. (.*)$/gm, '<li class="ml-5 pl-1 text-[rgba(220,235,255,0.88)] list-decimal marker:text-[color:hsl(var(--primary))]">$1</li>');
  html = html.replace(
    /(<li class="ml-5 pl-1 text-\[rgba\(220,235,255,0\.88\)\][^"]*">[\s\S]*?<\/li>\n?)+/g,
    '<ul class="list-disc my-5 space-y-2">$&</ul>'
  );

  // Paragraphs
  const lines = html.split('\n\n');
  html = lines
    .map((block) => {
      const trimmed = block.trim();
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<li') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<figure') ||
        trimmed.startsWith('<img') ||
        trimmed === ''
      ) {
        return trimmed;
      }
      return `<p class="text-[rgba(220,235,255,0.86)] leading-[1.8] my-5 text-[17px]">${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

export default function PostContent({ content }: PostContentProps) {
  const htmlContent = parseMarkdown(content);

  return (
    <div
      className="blog-prose max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
