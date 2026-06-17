'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Props {
  slug: string;
  initialCounts: Record<string, number>;
  initialMine: string[];
}

const REACTIONS: Array<{ type: string; emoji: string; label: string }> = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
];

export default function ReactionsBar({ slug, initialCounts, initialMine }: Props) {
  const { data: session } = useSession();
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts || {});
  const [mine, setMine] = useState<Set<string>>(new Set(initialMine || []));
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setCounts(initialCounts || {});
    setMine(new Set(initialMine || []));
  }, [initialCounts, initialMine]);

  const toggle = async (type: string) => {
    if (!session?.user?.id) {
      window.location.href = `/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (busy) return;
    setBusy(type);

    // Optimistic update
    const had = mine.has(type);
    const nextMine = new Set(mine);
    const nextCounts = { ...counts };
    if (had) {
      nextMine.delete(type);
      nextCounts[type] = Math.max(0, (nextCounts[type] || 0) - 1);
    } else {
      nextMine.add(type);
      nextCounts[type] = (nextCounts[type] || 0) + 1;
    }
    setMine(nextMine);
    setCounts(nextCounts);

    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts || {});
        setMine(new Set(data.mine || []));
      } else {
        // Roll back
        setMine(mine);
        setCounts(counts);
      }
    } catch {
      setMine(mine);
      setCounts(counts);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTIONS.map((r) => {
        const active = mine.has(r.type);
        const count = counts[r.type] || 0;
        return (
          <button
            key={r.type}
            type="button"
            onClick={() => toggle(r.type)}
            aria-pressed={active}
            aria-label={r.label}
            className={[
              'group inline-flex items-center gap-2 px-3.5 py-2 rounded-full border transition text-sm',
              active
                ? 'bg-[color:hsl(var(--primary)/0.14)] border-[color:hsl(var(--primary)/0.5)] text-[rgba(236,245,255,0.95)]'
                : 'bg-white/[0.04] border-white/[0.06] text-[rgba(220,235,255,0.8)] hover:border-[color:hsl(var(--primary)/0.4)] hover:text-white',
              busy === r.type ? 'opacity-70' : '',
            ].join(' ')}
          >
            <span className="text-base leading-none transition-transform group-hover:scale-110 group-active:scale-125">
              {r.emoji}
            </span>
            <span className="tabular-nums text-xs font-semibold">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
