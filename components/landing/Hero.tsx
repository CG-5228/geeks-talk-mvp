"use client";
import { useState, useEffect } from 'react';
import { ArrowRight, Radio, MessageSquare, Users, Mic } from 'lucide-react';
import { getLiveUrl } from '@/lib/getLiveUrl';

export default function Hero() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchOnline = async () => {
      try {
        const res = await fetch('/api/online', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setOnlineCount(typeof data.online === 'number' ? data.online : null);
      } catch {}
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const goToLive = () => {
    window.location.href = getLiveUrl('/text');
  };

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-[1]">
        <div className="absolute left-1/2 top-[-20%] h-[560px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.22),transparent_70%)] blur-3xl animate-glow-breathe motion-reduce:animate-none" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:hsl(var(--primary)/0.25)] bg-[color:hsl(var(--primary)/0.08)] px-3 py-1 text-xs font-medium text-[color:hsl(var(--primary))] backdrop-blur-md">
            <Radio className="h-3 w-3 animate-live-dot" aria-hidden="true" />
            <span className="font-mono tracking-tight tabular-nums">
              {onlineCount === null ? '—' : onlineCount} geeks online now
            </span>
          </div>

          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-white via-[color:hsl(var(--primary))] to-white bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer motion-reduce:animate-none">
              Learn together.
            </span>
            <br />
            <span className="bg-gradient-to-r from-white via-[color:hsl(var(--primary))] to-white bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer motion-reduce:animate-none [animation-delay:-3s]">
              Build together.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[rgba(220,235,255,0.8)] max-w-2xl mx-auto leading-relaxed">
            A live study hall where developers, students, and tech enthusiasts
            swap ideas, fix bugs, and spin up voice sessions when text isn&apos;t enough.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={goToLive}
              className="group inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition-all duration-200 hover:shadow-[0_0_36px_hsl(var(--primary)/0.55)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
            >
              Start chatting free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center rounded-md px-6 py-3 border border-white/[0.08] bg-[color:var(--card-bg)]/50 backdrop-blur-xl font-medium text-[rgba(236,245,255,0.95)] transition-all duration-200 hover:bg-[color:var(--card-bg)]/80 hover:border-[color:hsl(var(--primary)/0.35)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
            >
              See how it works
            </button>
          </div>

          <p className="mt-4 text-xs font-mono tracking-wide text-[rgba(220,235,255,0.5)]">
            Free forever · no credit card required
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { icon: MessageSquare, title: 'Real-time chat', note: 'Instant collaboration' },
            { icon: Users, title: 'Study groups', note: 'Learn with peers' },
            { icon: Mic, title: 'Voice rooms', note: 'Unlock with participation' },
          ].map(({ icon: Icon, title, note }) => (
            <div
              key={title}
              className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="flex-shrink-0 grid place-items-center h-10 w-10 rounded-lg bg-[color:hsl(var(--primary)/0.12)] border border-[color:hsl(var(--primary)/0.2)]">
                <Icon className="h-5 w-5 text-[color:hsl(var(--primary))]" aria-hidden="true" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-[rgba(236,245,255,0.95)]">{title}</div>
                <div className="text-sm text-[rgba(220,235,255,0.6)]">{note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
