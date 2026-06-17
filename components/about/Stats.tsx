import { Users, MessageSquare, GitBranch, Globe } from 'lucide-react';

export default function Stats() {
  const stats = [
    { label: 'Members', value: '2,100+', icon: Users, featured: true },
    { label: 'Messages shipped', value: '12.4k', icon: MessageSquare },
    { label: 'Open-source repos', value: '47', icon: GitBranch },
    { label: 'Countries', value: '23', icon: Globe },
  ];

  return (
    <section aria-label="Community stats" className="relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
            By the numbers
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-[rgba(236,245,255,0.98)]">
            A growing, global study hall
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, featured }) => (
            <div
              key={label}
              className={`group relative overflow-hidden rounded-2xl p-6 bg-[color:var(--card-bg)]/40 border border-white/[0.06] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:border-[color:hsl(var(--primary)/0.3)] hover:-translate-y-0.5 ${featured ? 'lg:col-span-1 lg:row-span-1' : ''}`}
            >
              {featured && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.22),transparent_70%)] blur-2xl"
                />
              )}
              <div className="relative flex items-start justify-between">
                <Icon className="h-5 w-5 text-[color:hsl(var(--primary))]/80" aria-hidden="true" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[rgba(220,235,255,0.4)]">
                  live
                </span>
              </div>
              <div className="relative mt-6">
                <div className="font-mono text-4xl sm:text-5xl font-semibold tracking-tight bg-gradient-to-br from-white to-[color:hsl(var(--primary)/0.75)] bg-clip-text text-transparent tabular-nums">
                  {value}
                </div>
                <div className="mt-2 text-sm text-[rgba(220,235,255,0.7)]">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
