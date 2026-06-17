import { Eye, Heart, Rocket, Volume2 } from 'lucide-react';

export default function ValuePills() {
  const principles = [
    {
      icon: Volume2,
      title: 'Learn out loud',
      description: 'Document your journey. Your struggle today helps someone else tomorrow — narrate the work, not just the result.',
      span: 'sm:col-span-2',
      featured: true,
    },
    {
      icon: Eye,
      title: 'Open by default',
      description: 'Learning happens in public. Share your work, ask questions, build together.',
    },
    {
      icon: Heart,
      title: 'Pragmatic kindness',
      description: 'Be helpful and constructive. Assume good intent, guide gently, celebrate progress.',
    },
    {
      icon: Rocket,
      title: 'Ship > polish',
      description: 'Done is better than perfect. Launch, learn, iterate — momentum beats perfection.',
    },
  ];

  return (
    <section aria-label="Core principles" className="relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
              Principles
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-[rgba(236,245,255,0.98)]">
              How we show up
            </h2>
          </div>
          <p className="text-sm text-[rgba(220,235,255,0.7)] max-w-sm">
            Four non-negotiables that shape every channel, voice room, and DM on the platform.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {principles.map(({ icon: Icon, title, description, span, featured }) => (
            <div
              key={title}
              className={`group relative overflow-hidden rounded-2xl p-6 bg-[color:var(--card-bg)]/40 border border-white/[0.06] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:border-[color:hsl(var(--primary)/0.25)] hover:bg-[color:var(--card-bg)]/60 hover:-translate-y-0.5 ${span ?? ''}`}
            >
              {featured && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.25),transparent_70%)] blur-2xl opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                />
              )}
              <div className="relative">
                <div className="inline-flex size-10 items-center justify-center rounded-lg bg-[color:hsl(var(--primary)/0.1)] ring-1 ring-[color:hsl(var(--primary)/0.25)]">
                  <Icon className="h-5 w-5 text-[color:hsl(var(--primary))]" aria-hidden="true" />
                </div>
                <h3 className={`mt-4 font-semibold text-[rgba(236,245,255,0.96)] ${featured ? 'text-xl' : 'text-base'}`}>
                  {title}
                </h3>
                <p className={`mt-2 text-[rgba(220,235,255,0.75)] leading-relaxed ${featured ? 'text-base max-w-md' : 'text-sm'}`}>
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
