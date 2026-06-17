'use client';

import { useEffect, useState } from 'react';
import { List } from 'lucide-react';
import type { TocEntry } from '@/lib/blog/tableOfContents';

interface Props {
  entries: TocEntry[];
}

export default function TableOfContents({ entries }: Props) {
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);

  useEffect(() => {
    if (!entries.length) return;

    const handler: IntersectionObserverCallback = (records) => {
      const visible = records
        .filter((r) => r.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        setActiveId(visible[0].target.id);
      }
    };

    const observer = new IntersectionObserver(handler, {
      rootMargin: '-20% 0px -60% 0px',
      threshold: [0, 1],
    });

    const nodes: Element[] = [];
    for (const entry of entries) {
      const node = document.getElementById(entry.id);
      if (node) {
        observer.observe(node);
        nodes.push(node);
      }
    }
    return () => observer.disconnect();
  }, [entries]);

  if (!entries.length) return null;

  return (
    <nav aria-label="Table of contents" className="w-full">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.6)] mb-4">
        <List className="w-3.5 h-3.5" />
        On this page
      </div>
      <ul className="space-y-1.5 text-sm border-l border-white/[0.08]">
        {entries.map((entry) => {
          const indent = entry.level === 2 ? 'pl-4' : entry.level === 3 ? 'pl-8' : 'pl-12';
          const isActive = entry.id === activeId;
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className={[
                  'block py-1 -ml-px border-l-2 transition-colors leading-snug',
                  indent,
                  isActive
                    ? 'border-[color:hsl(var(--primary))] text-[color:hsl(var(--primary))] font-medium'
                    : 'border-transparent text-[rgba(220,235,255,0.65)] hover:text-[rgba(236,245,255,0.95)]',
                ].join(' ')}
              >
                {entry.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
