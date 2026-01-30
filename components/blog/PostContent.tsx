'use client';

interface PostContentProps {
  content: string;
}

// Simple markdown parser - converts common markdown patterns to HTML
function parseMarkdown(text: string): string {
  let html = text;

  // Escape HTML entities first (security)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers (h1-h6)
  html = html.replace(/^###### (.*)$/gm, '<h6 class="text-sm font-semibold text-[rgba(236,245,255,0.95)] mt-6 mb-2">$1</h6>');
  html = html.replace(/^##### (.*)$/gm, '<h5 class="text-base font-semibold text-[rgba(236,245,255,0.95)] mt-6 mb-2">$1</h5>');
  html = html.replace(/^#### (.*)$/gm, '<h4 class="text-lg font-semibold text-[rgba(236,245,255,0.95)] mt-6 mb-3">$1</h4>');
  html = html.replace(/^### (.*)$/gm, '<h3 class="text-xl font-semibold text-[rgba(236,245,255,0.95)] mt-8 mb-3">$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2 class="text-2xl font-semibold text-[rgba(236,245,255,0.95)] mt-10 mb-4">$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1 class="text-3xl font-bold text-[rgba(236,245,255,0.98)] mt-10 mb-4">$1</h1>');

  // Code blocks (triple backticks)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-[#0d0d12] border border-[color:var(--card-ring)]/20 rounded-lg p-4 overflow-x-auto my-4"><code class="text-sm text-[rgba(220,235,255,0.9)] font-mono">$2</code></pre>'
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-[#1a1b23] px-1.5 py-0.5 rounded text-sm text-primary font-mono">$1</code>'
  );

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[rgba(236,245,255,0.95)]">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong class="font-semibold text-[rgba(236,245,255,0.95)]">$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4" />'
  );

  // Blockquotes
  html = html.replace(
    /^&gt; (.*)$/gm,
    '<blockquote class="border-l-4 border-primary/50 pl-4 py-1 my-4 text-[rgba(220,235,255,0.7)] italic">$1</blockquote>'
  );

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-[color:var(--card-ring)]/20 my-8" />');
  html = html.replace(/^\*\*\*$/gm, '<hr class="border-[color:var(--card-ring)]/20 my-8" />');

  // Unordered lists
  html = html.replace(
    /^[\*\-] (.*)$/gm,
    '<li class="ml-4 text-[rgba(220,235,255,0.85)]">$1</li>'
  );

  // Ordered lists (simple pattern)
  html = html.replace(
    /^\d+\. (.*)$/gm,
    '<li class="ml-4 text-[rgba(220,235,255,0.85)] list-decimal">$1</li>'
  );

  // Wrap consecutive list items in ul/ol
  html = html.replace(
    /(<li class="ml-4 text-\[rgba\(220,235,255,0\.85\)\]">[\s\S]*?<\/li>\n?)+/g,
    '<ul class="list-disc my-4 space-y-1">$&</ul>'
  );

  // Paragraphs - wrap text blocks that aren't already wrapped
  const lines = html.split('\n\n');
  html = lines
    .map((block) => {
      const trimmed = block.trim();
      // Don't wrap if it's already an HTML element
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<li') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<img') ||
        trimmed === ''
      ) {
        return trimmed;
      }
      return `<p class="text-[rgba(220,235,255,0.85)] leading-relaxed my-4">${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

export default function PostContent({ content }: PostContentProps) {
  const htmlContent = parseMarkdown(content);

  return (
    <div
      className="prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
