import { Eye, Heart, Rocket, Volume2 } from 'lucide-react';

export default function ValuePills() {
  const principles = [
    {
      icon: Eye,
      title: 'Open by default',
      description: 'Learning happens in public. Share your work, ask questions, and build together.',
    },
    {
      icon: Heart,
      title: 'Pragmatic kindness',
      description: 'Be helpful and constructive. Assume good intent, guide gently, celebrate progress.',
    },
    {
      icon: Rocket,
      title: 'Ship > polish',
      description: 'Done is better than perfect. Launch, learn, iterate—momentum beats perfection.',
    },
    {
      icon: Volume2,
      title: 'Learn out loud',
      description: 'Document your journey. Your struggle today helps someone else tomorrow.',
    },
  ];
  
  return (
    <section aria-label="Core principles" className="border-t border-border/20">
      <div className="h-1 bg-gradient-to-r from-primary/30 via-transparent to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Core principles</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {principles.map(({ icon: Icon, title, description }) => (
            <div 
              key={title} 
              className="relative rounded-xl p-5 bg-card/30 border border-border/20 backdrop-blur-xl"
            >
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
