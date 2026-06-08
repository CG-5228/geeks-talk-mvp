"use client";
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Users, MessageSquare, Mic } from 'lucide-react';
import { getLiveUrl } from '@/lib/getLiveUrl';

function LiveOnlineBadge() {
  const [online, setOnline] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    const fetchOnline = async () => {
      try {
        const res = await fetch('/api/online', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setOnline(typeof data.online === 'number' ? data.online : null);
      } catch {}
    };
    fetchOnline();
    const id = setInterval(fetchOnline, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);
  return (
    <div className="inline-flex items-center gap-2 font-mono tabular-nums">
      <span className="h-1.5 w-1.5 rounded-full bg-[#5cf08b] animate-live-dot" />
      <span>{online === null ? '—' : online} geeks online now</span>
    </div>
  );
}

const benefits = [
  'Join 500+ active members',
  'Access to all subject channels',
  'Real-time chat and collaboration',
  'Voice rooms (unlock with participation)',
  'Direct messaging with peers',
  'No credit card required',
];

export default function FinalCTA() {
  const goToLive = () => {
    window.location.href = getLiveUrl('/text');
  };

  return (
    <section aria-label="Join the community" className="relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="relative max-w-4xl mx-auto overflow-hidden rounded-3xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-6 py-14 sm:px-12 sm:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-64 w-[80%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.25),transparent_70%)] blur-3xl" />
          </div>

          <div className="relative text-center">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
              Join the community
            </p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
              <span className="bg-gradient-to-br from-white to-[color:hsl(var(--primary)/0.8)] bg-clip-text text-transparent">
                Start your journey today.
              </span>
              <br />
              <span className="text-[rgba(236,245,255,0.9)]">Build it together.</span>
            </h2>
            <p className="mt-5 text-base sm:text-lg text-[rgba(220,235,255,0.75)] max-w-xl mx-auto">
              Connect with learners, developers, and tech enthusiasts — in real-time,
              from anywhere.
            </p>
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={goToLive}
                className="group inline-flex items-center gap-2 rounded-md px-8 py-4 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold text-base shadow-[0_0_24px_hsl(var(--primary)/0.4)] transition-all duration-200 hover:shadow-[0_0_36px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
              >
                Start chatting free
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 text-xs font-mono tracking-wide text-[rgba(220,235,255,0.5)]">
              Free forever · no credit card required
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
          {benefits.map((b) => (
            <div
              key={b}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-4 py-3"
            >
              <Check
                className="h-4 w-4 flex-shrink-0 text-[color:hsl(var(--primary))]"
                aria-hidden="true"
              />
              <span className="text-sm text-[rgba(236,245,255,0.9)]">{b}</span>
            </div>
          ))}
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            {
              icon: Users,
              title: 'Active community',
              note: 'Hundreds of learners and devs',
            },
            {
              icon: MessageSquare,
              title: 'Real-time chat',
              note: 'Instant help, shared knowledge',
            },
            {
              icon: Mic,
              title: 'Voice collaboration',
              note: 'Unlock rooms for group study',
            },
          ].map(({ icon: Icon, title, note }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[color:hsl(var(--primary)/0.12)] border border-[color:hsl(var(--primary)/0.25)]">
                <Icon className="h-5 w-5 text-[color:hsl(var(--primary))]" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-[rgba(236,245,255,0.95)]">{title}</h3>
              <p className="mt-1 text-sm text-[rgba(220,235,255,0.6)]">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/[0.05]">
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-sm text-[rgba(220,235,255,0.55)]">
            <LiveOnlineBadge />
            <span className="text-[rgba(220,235,255,0.3)]">·</span>
            <span className="font-mono tracking-tight">No spam, community-moderated</span>
            <span className="text-[rgba(220,235,255,0.3)]">·</span>
            <span className="font-mono tracking-tight">Free forever</span>
          </div>
        </div>
      </div>
    </section>
  );
}
