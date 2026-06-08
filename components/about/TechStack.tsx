import { Code2, Database, Palette, Server, Wifi, Layers } from 'lucide-react';

export default function TechStack() {
  const tools = [
    { name: 'Next.js', slug: 'next', icon: Code2, featured: true, note: 'App Router · RSC' },
    { name: 'React', slug: 'react', icon: Layers, note: '18.2' },
    { name: 'Tailwind', slug: 'tailwind', icon: Palette, note: 'v3' },
    { name: 'Prisma', slug: 'prisma', icon: Server, note: 'ORM' },
    { name: 'PostgreSQL', slug: 'postgres', icon: Database, note: 'Primary DB' },
    { name: 'WebRTC', slug: 'webrtc', icon: Wifi, note: 'LiveKit' },
  ];

  return (
    <section aria-label="The stack" className="relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
            Under the hood
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-[rgba(236,245,255,0.98)]">
            The stack
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tools.map(({ name, icon: Icon, note, featured }) => (
            <div
              key={name}
              className={`group relative overflow-hidden rounded-2xl p-5 bg-[color:var(--card-bg)]/40 border border-white/[0.06] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:border-[color:hsl(var(--primary)/0.3)] hover:-translate-y-0.5 ${featured ? 'lg:col-span-2 lg:row-span-1' : ''}`}
            >
              {featured && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.2),transparent_70%)] blur-2xl"
                />
              )}
              <div className="relative flex items-center gap-3">
                <div className="inline-flex size-10 items-center justify-center rounded-lg bg-[color:hsl(var(--primary)/0.08)] ring-1 ring-[color:hsl(var(--primary)/0.2)]">
                  <Icon className="h-5 w-5 text-[color:hsl(var(--primary))]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-sm font-medium text-[rgba(236,245,255,0.95)] truncate">
                    {name}
                  </div>
                  <div className="text-[11px] text-[rgba(220,235,255,0.55)] truncate">
                    {note}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
