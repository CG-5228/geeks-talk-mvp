"use client";

import Link from 'next/link';
import { ArrowRight, Radio } from 'lucide-react';
import { getLiveUrl } from '@/lib/getLiveUrl';

export default function Hero() {
  const goToLive = () => {
    window.location.href = getLiveUrl('/text');
  };

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[1]"
      >
        <div className="absolute left-1/2 top-[-20%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.25),transparent_70%)] blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-3xl animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:hsl(var(--primary)/0.25)] bg-[color:hsl(var(--primary)/0.08)] px-3 py-1 text-xs font-medium text-[color:hsl(var(--primary))] backdrop-blur-md">
            <Radio className="h-3 w-3 animate-live-dot" aria-hidden="true" />
            <span className="font-mono tracking-tight">Live study hall · always-on</span>
          </div>

          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-br from-white via-[rgba(236,245,255,0.96)] to-[color:hsl(var(--primary)/0.85)] bg-clip-text text-transparent">
              Geeks Talk
            </span>
          </h1>

          <p className="mt-5 text-xl sm:text-2xl text-[rgba(220,235,255,0.9)] max-w-2xl">
            A community where builders, students, and researchers{' '}
            <span className="text-[color:hsl(var(--primary))]">learn out loud</span>.
          </p>

          <p className="mt-5 text-base sm:text-lg text-[rgba(220,235,255,0.7)] max-w-2xl leading-relaxed">
            Swap ideas, fix bugs together, and spin up a live voice session when text isn&apos;t enough. Jump into a subject hub, ask for help, or teach what you just learned.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={goToLive}
              aria-label="Get Started on Live"
              className="group inline-flex items-center gap-2 rounded-md px-6 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition-all duration-200 hover:shadow-[0_0_32px_hsl(var(--primary)/0.55)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>

            <Link
              href="/about#roadmap"
              aria-label="View Roadmap"
              className="inline-flex items-center rounded-md px-6 py-3 border border-white/[0.08] bg-[color:var(--card-bg)]/50 backdrop-blur-xl transition-all duration-200 hover:bg-[color:var(--card-bg)]/80 hover:border-[color:hsl(var(--primary)/0.35)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
            >
              View Roadmap
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
