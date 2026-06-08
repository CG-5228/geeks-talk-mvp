import { Check, Loader2, Sparkles } from 'lucide-react';

type Status = 'done' | 'progress' | 'planned';

export default function Roadmap() {
  const items: Array<{ status: Status; title: string; description: string }> = [
    {
      status: 'done',
      title: 'Live text channels',
      description: 'Real-time messaging across subject hubs with threading support.',
    },
    {
      status: 'progress',
      title: 'Voice rooms & WebRTC',
      description: 'Unlock voice after first message. Create topic rooms and talk it out.',
    },
    {
      status: 'planned',
      title: 'Study groups & screen-share',
      description: 'Scheduled sessions with whiteboards, co-browsing, and persistent notes.',
    },
    {
      status: 'planned',
      title: 'Recording & transcripts',
      description: 'Opt-in recording with AI summaries and searchable transcripts.',
    },
    {
      status: 'planned',
      title: 'Reputation & kudos',
      description: 'Recognize helpful members, earn badges, and build your teaching portfolio.',
    },
  ];

  const statusConfig: Record<Status, {
    label: string;
    icon: typeof Check;
    color: string;
    bg: string;
    border: string;
    glow: string;
    spin?: boolean;
  }> = {
    done: {
      label: 'Shipped',
      icon: Check,
      color: 'text-emerald-300',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/30',
      glow: '',
    },
    progress: {
      label: 'In progress',
      icon: Loader2,
      color: 'text-[color:hsl(var(--primary))]',
      bg: 'bg-[color:hsl(var(--primary)/0.1)]',
      border: 'border-[color:hsl(var(--primary)/0.35)]',
      glow: 'shadow-[0_0_20px_hsl(var(--primary)/0.4)]',
      spin: true,
    },
    planned: {
      label: 'Planned',
      icon: Sparkles,
      color: 'text-[rgba(220,235,255,0.55)]',
      bg: 'bg-white/[0.04]',
      border: 'border-white/10',
      glow: '',
    },
  };

  return (
    <section id="roadmap" aria-label="Roadmap" className="relative scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
            What&apos;s next
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-[rgba(236,245,255,0.98)]">
            Roadmap
          </h2>
        </div>

        <div className="mt-12 relative">
          <div
            aria-hidden
            className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-emerald-400/40 via-[color:hsl(var(--primary)/0.3)] to-white/10"
          />

          <ol className="relative space-y-5">
            {items.map((item, idx) => {
              const config = statusConfig[item.status];
              const Icon = config.icon;
              return (
                <li key={idx} className="group relative flex items-start gap-5">
                  <div
                    className={`relative z-10 flex-shrink-0 size-12 rounded-full ${config.bg} border ${config.border} ${config.glow} flex items-center justify-center backdrop-blur-md transition-all duration-300 group-hover:scale-105`}
                  >
                    <Icon
                      className={`h-5 w-5 ${config.color} ${config.spin ? 'motion-safe:animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0 pt-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-[rgba(236,245,255,0.96)]">
                        {item.title}
                      </h3>
                      <span
                        className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-[rgba(220,235,255,0.7)] leading-relaxed max-w-2xl">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
