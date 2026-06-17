"use client";
import { useRef } from 'react';
import { MessageSquare, Users, Mic, Code, Calculator, Brain, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Real-time chat channels',
    description: 'Join subject-specific channels for CS, Math, AI, and more. Instant help, shared knowledge, zero friction.',
    benefits: ['Instant responses', 'Subject-focused', 'Always on'],
    featured: true,
  },
  {
    icon: Mic,
    title: 'Voice rooms',
    description: 'Unlock voice collaboration after text participation. Perfect for group study and deep-dive discussions.',
    benefits: ['Group study', 'Real-time', 'Earned access'],
  },
  {
    icon: Users,
    title: 'Direct messaging',
    description: 'Reach peers one-on-one for targeted help, project collaboration, and lasting connections.',
    benefits: ['1:1 help', 'Collaboration', 'Connections'],
  },
];

const subjects = [
  { icon: Code, name: 'Computer Science', note: 'Algorithms · Systems' },
  { icon: Calculator, name: 'Mathematics', note: 'Proofs · Problem sets' },
  { icon: Brain, name: 'Artificial Intelligence', note: 'ML · Research' },
  { icon: Shield, name: 'Cybersecurity', note: 'CTF · Offense/Defense' },
  { icon: Zap, name: 'Web Development', note: 'Frontend · Full-stack' },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  benefits,
  featured,
}: {
  icon: typeof MessageSquare;
  title: string;
  description: string;
  benefits: readonly string[];
  featured?: boolean;
}) {
  const cardRef = useRef<HTMLElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!featured || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--spot-x', `${x}%`);
    cardRef.current.style.setProperty('--spot-y', `${y}%`);
  };

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={[
        'group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color:hsl(var(--primary)/0.3)]',
        featured ? 'sm:col-span-2 sm:row-span-1' : '',
      ].join(' ')}
      style={
        featured
          ? ({
              '--spot-x': '50%',
              '--spot-y': '50%',
            } as React.CSSProperties)
          : undefined
      }
    >
      {featured && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(400px circle at var(--spot-x) var(--spot-y), hsl(var(--primary) / 0.18), transparent 60%)',
            }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.22),transparent_70%)] blur-2xl" />
          </div>
        </>
      )}
      <div className="relative">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:hsl(var(--primary)/0.12)] border border-[color:hsl(var(--primary)/0.25)]">
          <Icon className="h-5 w-5 text-[color:hsl(var(--primary))]" aria-hidden="true" />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-[rgba(236,245,255,0.95)]">{title}</h3>
        <p className="mt-2 text-[rgba(220,235,255,0.7)] leading-relaxed">{description}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {benefits.map((b) => (
            <li
              key={b}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs font-mono tracking-tight text-[rgba(220,235,255,0.75)]"
            >
              <span className="h-1 w-1 rounded-full bg-[color:hsl(var(--primary))]" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
            Features
          </p>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
            <span className="bg-gradient-to-br from-white to-[color:hsl(var(--primary)/0.8)] bg-clip-text text-transparent">
              Everything you need
            </span>
            <br />
            <span className="text-[rgba(236,245,255,0.9)]">to learn and grow.</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-[rgba(220,235,255,0.7)] max-w-xl leading-relaxed">
            From real-time chat to voice collaboration — the tools you need to ship, study, and teach.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>

        <div className="mt-24">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
              Channels
            </p>
            <p className="text-sm text-[rgba(220,235,255,0.55)] font-mono">
              Join by subject
            </p>
          </div>
          <h3 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[rgba(236,245,255,0.95)]">
            Pick a room. Find your people.
          </h3>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {subjects.map(({ icon: Icon, name, note }) => (
              <div
                key={name}
                className="group cursor-pointer rounded-xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:hsl(var(--primary)/0.3)]"
              >
                <Icon
                  className="h-6 w-6 text-[color:hsl(var(--primary))] transition-transform duration-200 group-hover:scale-110"
                  aria-hidden="true"
                />
                <div className="mt-3 text-sm font-semibold text-[rgba(236,245,255,0.95)]">{name}</div>
                <div className="mt-0.5 text-[11px] font-mono tracking-tight text-[rgba(220,235,255,0.5)]">
                  {note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
