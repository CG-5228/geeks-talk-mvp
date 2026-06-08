export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Join',
      description: 'Sign up and pick your first subject — CS, Math, AI, or explore all hubs.',
    },
    {
      number: '02',
      title: 'Explore channels',
      description: 'Browse topic threads or drop into the live text room to see what others are discussing.',
    },
    {
      number: '03',
      title: 'Ask & share',
      description: 'Post a question, share a code snippet, or offer help. Get answers in minutes, not days.',
    },
    {
      number: '04',
      title: 'Go live',
      description: 'Unlock voice rooms after your first message. Start a topic session and talk it out.',
    },
    {
      number: '05',
      title: 'Follow & DM',
      description: 'Connect with helpful members, follow their activity, and continue the conversation.',
    },
  ];

  return (
    <section aria-label="How it works" className="relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
            Getting started
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-[rgba(236,245,255,0.98)]">
            Five steps, then you&apos;re in
          </h2>
        </div>

        <div className="mt-12 relative">
          <div
            aria-hidden
            className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-[color:hsl(var(--primary)/0.4)] via-[color:hsl(var(--primary)/0.15)] to-transparent"
          />

          <ol className="space-y-8">
            {steps.map((step) => (
              <li key={step.number} className="group relative flex items-start gap-5">
                <div className="relative z-10 flex-shrink-0 mt-0.5">
                  <div className="size-6 rounded-full bg-[hsl(var(--bg))] ring-2 ring-[color:hsl(var(--primary)/0.4)] flex items-center justify-center transition-all duration-300 group-hover:ring-[color:hsl(var(--primary))] group-hover:shadow-[0_0_16px_hsl(var(--primary)/0.5)]">
                    <div className="size-2 rounded-full bg-[color:hsl(var(--primary))] transition-transform duration-300 group-hover:scale-125" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-mono text-xs text-[color:hsl(var(--primary))]/70 tracking-widest">
                      {step.number}
                    </span>
                    <h3 className="text-lg font-semibold text-[rgba(236,245,255,0.96)]">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-1.5 text-[rgba(220,235,255,0.75)] leading-relaxed max-w-2xl">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
