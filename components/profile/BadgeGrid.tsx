'use client';

import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { Lock } from 'lucide-react';

type Badge = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: string;
  awardedAt?: string;
};

const RARITY_RING: Record<string, string> = {
  common: 'ring-slate-400/30',
  rare: 'ring-cyan-400/40',
  epic: 'ring-violet-400/50',
  legendary: 'ring-amber-400/60',
};
const COLOR_BG: Record<string, string> = {
  cyan: 'from-cyan-500/20 to-cyan-400/5 text-cyan-300',
  violet: 'from-violet-500/20 to-violet-400/5 text-violet-300',
  amber: 'from-amber-500/20 to-amber-400/5 text-amber-300',
  rose: 'from-rose-500/20 to-rose-400/5 text-rose-300',
  emerald: 'from-emerald-500/20 to-emerald-400/5 text-emerald-300',
  slate: 'from-slate-500/20 to-slate-400/5 text-slate-300',
};

function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (Icon) return <Icon className={className} />;
  return <Icons.Sparkles className={className} />;
}

export default function BadgeGrid({ username }: { username?: string }) {
  const [earned, setEarned] = useState<Badge[]>([]);
  const [locked, setLocked] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = username ? `/api/user/badges?username=${encodeURIComponent(username)}` : '/api/user/badges';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.earned)) setEarned(d.earned);
        if (Array.isArray(d.locked)) setLocked(d.locked);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/20 bg-card/30 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (earned.length === 0 && locked.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No badges yet.</p>;
  }

  return (
    <div className="space-y-6">
      {earned.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Earned · {earned.length}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {earned.map((b) => (
              <div
                key={b.slug}
                title={`${b.name} — ${b.description}`}
                className={`group relative rounded-xl border border-border/20 bg-gradient-to-br ${COLOR_BG[b.color] || COLOR_BG.cyan} p-4 ring-1 ${RARITY_RING[b.rarity] || RARITY_RING.common} transition hover:scale-[1.02]`}
              >
                <BadgeIcon name={b.icon} className="h-7 w-7 mb-2" />
                <div className="text-sm font-semibold text-foreground">{b.name}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{b.description}</div>
                <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {b.rarity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Locked · {locked.length}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {locked.map((b) => (
              <div
                key={b.slug}
                title={`${b.name} — ${b.description}`}
                className="relative rounded-xl border border-border/20 bg-card/20 p-4 opacity-60"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <BadgeIcon name={b.icon} className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-sm font-semibold text-muted-foreground">{b.name}</div>
                <div className="text-[11px] text-muted-foreground/80 line-clamp-2">{b.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
