"use client";
import { useEffect, useRef } from 'react';
import { Hash, MessageSquare, Mic, ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLiveUrl } from '@/lib/getLiveUrl';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const steps = [
  {
    number: '01',
    icon: Hash,
    title: 'Join a channel',
    description:
      'Pick a subject — CS, Math, AI, or anything you care about. Jump straight into the conversation.',
  },
  {
    number: '02',
    icon: MessageSquare,
    title: 'Ask & answer',
    description:
      'Get help on your questions. Help others with theirs. Build reputation through useful contributions.',
  },
  {
    number: '03',
    icon: Mic,
    title: 'Level up',
    description:
      'Unlock voice rooms and advanced features as you participate. Host study sessions and real-time collabs.',
  },
];

export default function HowItWorks() {
  const rootRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !rootRef.current) return;

    const root = rootRef.current;
    const ctx = gsap.context(() => {
      if (railRef.current) {
        gsap.fromTo(
          railRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: railRef.current,
              start: 'top 80%',
              end: 'bottom 60%',
              scrub: 0.6,
            },
          }
        );
      }

      const steps = root.querySelectorAll<HTMLElement>('[data-step]');
      if (steps.length) {
        gsap.from(steps, {
          y: 24,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.12,
          scrollTrigger: {
            trigger: root,
            start: 'top 85%',
            once: true,
          },
        });
      }
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const goToLive = () => {
    window.location.href = getLiveUrl('/text');
  };

  return (
    <section ref={rootRef} className="relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
            How it works
          </p>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
            <span className="bg-gradient-to-br from-white to-[color:hsl(var(--primary)/0.8)] bg-clip-text text-transparent">
              Join. Participate.
            </span>
            <br />
            <span className="text-[rgba(236,245,255,0.9)]">Unlock more.</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-[rgba(220,235,255,0.7)] max-w-xl leading-relaxed">
            Getting started is simple. Three steps to go from lurking to leading.
          </p>
        </div>

        <ol className="mt-14 relative">
          <div
            ref={railRef}
            aria-hidden
            className="pointer-events-none absolute left-[27px] top-4 bottom-4 w-px origin-top bg-gradient-to-b from-[color:hsl(var(--primary)/0.4)] via-[color:hsl(var(--primary)/0.15)] to-transparent hidden sm:block"
          />
          <div className="space-y-4">
            {steps.map(({ number, icon: Icon, title, description }) => (
              <li
                key={number}
                data-step
                className="relative flex items-start gap-5 rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:hsl(var(--primary)/0.3)]"
              >
                <div className="relative flex-shrink-0">
                  <div className="grid place-items-center h-14 w-14 rounded-xl bg-[color:hsl(var(--primary)/0.12)] border border-[color:hsl(var(--primary)/0.25)]">
                    <Icon className="h-6 w-6 text-[color:hsl(var(--primary))]" aria-hidden="true" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs tracking-[0.2em] text-[color:hsl(var(--primary))]">
                      {number}
                    </span>
                    <h3 className="text-lg font-semibold text-[rgba(236,245,255,0.95)]">{title}</h3>
                  </div>
                  <p className="mt-2 text-[rgba(220,235,255,0.7)] leading-relaxed">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </div>
        </ol>

        <div className="mt-10">
          <button
            type="button"
            onClick={goToLive}
            className="group inline-flex items-center gap-2 rounded-md px-6 py-3 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition-all duration-200 hover:shadow-[0_0_36px_hsl(var(--primary)/0.55)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
          >
            Ready to get started?
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
