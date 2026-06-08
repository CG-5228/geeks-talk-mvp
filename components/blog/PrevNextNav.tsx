import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Props {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

export default function PrevNextNav({ prev, next }: Props) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Post navigation" className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {prev ? (
        <Link
          href={`/blog/${prev.slug}`}
          className="group rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/50 hover:border-[color:hsl(var(--primary)/0.4)] transition p-5"
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.55)]">
            <ArrowLeft className="w-3 h-3" /> Previous
          </div>
          <div className="mt-1.5 text-sm font-semibold text-[rgba(236,245,255,0.95)] line-clamp-2 group-hover:text-[color:hsl(var(--primary))] transition">
            {prev.title}
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className="group rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/50 hover:border-[color:hsl(var(--primary)/0.4)] transition p-5 text-right"
        >
          <div className="flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.55)]">
            Next <ArrowRight className="w-3 h-3" />
          </div>
          <div className="mt-1.5 text-sm font-semibold text-[rgba(236,245,255,0.95)] line-clamp-2 group-hover:text-[color:hsl(var(--primary))] transition">
            {next.title}
          </div>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
