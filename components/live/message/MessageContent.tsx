"use client";
import { Children, Fragment, isValidElement, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MessageContentProps {
  content: string;
  isOwnMessage?: boolean;
}

const MENTION_RE = /(@[A-Za-z0-9_]{2,32})/g;

function renderTextWithMentions(text: string) {
  const parts = text.split(MENTION_RE);
  return parts.map((part, i) =>
    MENTION_RE.test(part) ? (
      <span
        key={i}
        className="inline rounded px-1 py-[1px] font-medium text-[color:hsl(var(--primary))] bg-[color:hsl(var(--primary)/0.12)]"
      >
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

// Walks markdown component children and replaces string segments with
// mention-annotated spans while leaving inline markdown nodes (bold, code, etc.) alone.
function walkChildren(children: React.ReactNode): React.ReactNode {
  return Children.map(children, (child, idx) => {
    if (typeof child === 'string') return <Fragment key={idx}>{renderTextWithMentions(child)}</Fragment>;
    if (Array.isArray(child)) return walkChildren(child);
    if (isValidElement(child)) return child;
    return child;
  });
}

export default function MessageContent({ content, isOwnMessage }: MessageContentProps) {
  const toneClass = isOwnMessage ? 'text-right' : 'text-left';

  const components = useMemo(
    () => ({
      p: ({ children }: any) => (
        <p className={`leading-relaxed whitespace-pre-wrap break-words`}>{walkChildren(children)}</p>
      ),
      li: ({ children }: any) => <li className="leading-relaxed">{walkChildren(children)}</li>,
      strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
      em: ({ children }: any) => <em className="italic">{children}</em>,
      a: ({ href, children }: any) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[color:hsl(var(--primary)/0.5)] underline-offset-2 hover:text-[color:hsl(var(--primary))] break-all"
        >
          {children}
        </a>
      ),
      code: ({ className, children }: any) => {
        const isBlock = /language-/.test(className || '');
        if (isBlock) {
          return <code className={className}>{children}</code>;
        }
        return (
          <code className="rounded px-1.5 py-0.5 bg-white/10 text-[0.9em] font-mono border border-white/5">
            {children}
          </code>
        );
      },
      pre: ({ children }: any) => (
        <pre className="my-2 rounded-lg bg-[#0b1220] border border-white/10 p-3 overflow-x-auto text-xs leading-relaxed">
          {children}
        </pre>
      ),
      ul: ({ children }: any) => <ul className="list-disc ml-5 my-1 space-y-0.5">{children}</ul>,
      ol: ({ children }: any) => <ol className="list-decimal ml-5 my-1 space-y-0.5">{children}</ol>,
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-white/20 pl-3 my-1 text-[rgba(220,235,255,0.75)]">
          {children}
        </blockquote>
      ),
      h1: ({ children }: any) => <h3 className="text-base font-semibold mt-1">{walkChildren(children)}</h3>,
      h2: ({ children }: any) => <h3 className="text-base font-semibold mt-1">{walkChildren(children)}</h3>,
      h3: ({ children }: any) => <h3 className="text-sm font-semibold mt-1">{walkChildren(children)}</h3>,
      hr: () => <hr className="my-2 border-white/10" />,
    }),
    []
  );

  return (
    <div className={`prose-chat text-[rgba(220,235,255,0.92)] ${toneClass}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
