export default function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Join',
      description: 'Sign up and pick your first subject—CS, Math, AI, or explore all hubs.',
    },
    {
      number: 2,
      title: 'Explore channels',
      description: 'Browse topic threads or drop into the live text room to see what others are discussing.',
    },
    {
      number: 3,
      title: 'Ask & Share',
      description: 'Post a question, share a code snippet, or offer help. Get answers in minutes, not days.',
    },
    {
      number: 4,
      title: 'Go Live',
      description: 'Unlock voice rooms after your first message. Start a topic session and talk it out.',
    },
    {
      number: 5,
      title: 'Follow & DM',
      description: 'Connect with helpful members, follow their activity, and continue the conversation.',
    },
  ];
  
  return (
    <section aria-label="How it works" className="border-t border-border/20">
      <div className="h-1 bg-gradient-to-r from-primary/30 via-transparent to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">How it works</h2>
        <div className="mt-8 space-y-6">
          {steps.map((step, idx) => (
            <div key={step.number}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 size-10 rounded-full bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">{step.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="ml-5 mt-4 mb-2 h-px bg-border/20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
