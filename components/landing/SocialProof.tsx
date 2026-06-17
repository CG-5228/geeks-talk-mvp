"use client";
import { useEffect, useRef } from 'react';
import { MessageSquare, Users, TrendingUp, Star } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type Stat = {
  icon: typeof MessageSquare;
  label: string;
  target: number;
  format: (n: number) => string;
};

const stats: Stat[] = [
  {
    icon: MessageSquare,
    label: 'Messages sent',
    target: 10000,
    format: (n) => (n >= 1000 ? `${Math.round(n / 1000)}K+` : `${Math.round(n)}+`),
  },
  {
    icon: Users,
    label: 'Active members',
    target: 500,
    format: (n) => `${Math.round(n)}+`,
  },
  {
    icon: TrendingUp,
    label: 'Study rooms',
    target: 50,
    format: (n) => `${Math.round(n)}+`,
  },
  {
    icon: Star,
    label: 'Community rating',
    target: 4.9,
    format: (n) => n.toFixed(1),
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Computer Science Student',
    avatar: 'SC',
    content:
      'Geeks Talk helped me understand complex algorithms through real-time discussions. The community is incredibly supportive.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Software Developer',
    avatar: 'MJ',
    content:
      "I've found study partners and even landed a job referral through the connections I made here.",
    rating: 5,
  },
  {
    name: 'Alex Rivera',
    role: 'Data Science Student',
    avatar: 'AR',
    content:
      'The voice rooms are perfect for group projects. We collaborate in real-time and get instant feedback.',
    rating: 5,
  },
];

const universities = ['Stanford', 'MIT', 'Berkeley', 'Carnegie Mellon', 'And many more'];

export default function SocialProof() {
  const statRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      statRefs.current.forEach((el, i) => {
        if (!el) return;
        const { target, format } = stats[i];
        if (reduceMotion) {
          el.textContent = format(target);
          return;
        }
        const obj = { value: 0 };
        gsap.to(obj, {
          value: target,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
          onUpdate: () => {
            el.textContent = format(obj.value);
          },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ icon: Icon, label, format }, i) => (
            <div
              key={label}
              className="rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6"
            >
              <Icon className="h-5 w-5 text-[color:hsl(var(--primary))]" aria-hidden="true" />
              <div className="mt-4 font-mono text-4xl sm:text-5xl font-semibold tabular-nums bg-gradient-to-br from-white to-[color:hsl(var(--primary)/0.75)] bg-clip-text text-transparent">
                <span
                  ref={(el) => {
                    statRefs.current[i] = el;
                  }}
                >
                  {format(0)}
                </span>
              </div>
              <div className="mt-1 text-sm text-[rgba(220,235,255,0.6)]">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-24 max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
            Community
          </p>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
            <span className="bg-gradient-to-br from-white to-[color:hsl(var(--primary)/0.8)] bg-clip-text text-transparent">
              Loved by students
            </span>
            <br />
            <span className="text-[rgba(236,245,255,0.9)]">and developers.</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-[rgba(220,235,255,0.7)] max-w-xl leading-relaxed">
            Real stories from people already learning and building together.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="relative flex flex-col rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color:hsl(var(--primary)/0.3)]"
            >
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#f5c04a] text-[#f5c04a]" aria-hidden="true" />
                ))}
              </div>
              <blockquote className="mt-4 text-[rgba(236,245,255,0.9)] leading-relaxed">
                &ldquo;{t.content}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 pt-5 border-t border-white/[0.05]">
                <div className="grid place-items-center h-10 w-10 rounded-full bg-[color:hsl(var(--primary)/0.12)] border border-[color:hsl(var(--primary)/0.25)] font-mono text-sm font-semibold text-[color:hsl(var(--primary))]">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[rgba(236,245,255,0.95)]">{t.name}</div>
                  <div className="text-xs font-mono tracking-tight text-[rgba(220,235,255,0.5)]">
                    {t.role}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-20">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[rgba(220,235,255,0.45)] text-center">
            Trusted by students from
          </p>
          <div className="mt-5 flex flex-wrap justify-center items-center gap-2">
            {universities.map((u) => (
              <span
                key={u}
                className="rounded-md border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-sm font-mono tracking-tight text-[rgba(220,235,255,0.55)]"
              >
                {u}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
