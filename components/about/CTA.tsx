"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getLiveUrl } from '@/lib/getLiveUrl';

export default function CTA() {
  const goToLive = () => {
    window.location.href = getLiveUrl('/text');
  };

  return (
    <section aria-label="Build with us" className="relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="relative max-w-3xl mx-auto text-center overflow-hidden rounded-3xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-6 py-16 sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute left-1/2 top-0 h-64 w-[80%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.25),transparent_70%)] blur-3xl" />
          </div>

          <div className="relative">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
              Build with us
            </p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
              <span className="bg-gradient-to-br from-white to-[color:hsl(var(--primary)/0.8)] bg-clip-text text-transparent">
                Bring your project.
              </span>
              <br />
              <span className="text-[rgba(236,245,255,0.9)]">Find your people.</span>
            </h2>
            <p className="mt-5 text-base sm:text-lg text-[rgba(220,235,255,0.75)] max-w-xl mx-auto">
              A live study hall where every question finds an answer, and every answer finds a teacher.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={goToLive}
                className="group inline-flex items-center gap-2 rounded-md px-6 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium shadow-[0_0_24px_hsl(var(--primary)/0.4)] transition-all duration-200 hover:shadow-[0_0_36px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
              >
                Open Live
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-md px-6 py-3 border border-white/[0.08] bg-[color:var(--card-bg)]/40 backdrop-blur-xl font-medium text-[rgba(236,245,255,0.95)] transition-all duration-200 hover:bg-[color:var(--card-bg)]/70 hover:border-[color:hsl(var(--primary)/0.35)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
              >
                Sign up
              </Link>
            </div>
            <p className="mt-6 text-xs font-mono tracking-wide text-[rgba(220,235,255,0.5)]">
              No spam · community-moderated
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
