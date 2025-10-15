import { Check, Loader2, Calendar } from 'lucide-react';

export default function Roadmap() {
  const items = [
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
  
  const statusConfig = {
    done: { label: 'Done', icon: Check, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    progress: { label: 'In progress', icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    planned: { label: 'Planned', icon: Calendar, color: 'text-muted-foreground', bg: 'bg-muted/10', border: 'border-border/20' },
  };
  
  return (
    <section id="roadmap" aria-label="Roadmap" className="border-t border-border/20">
      <div className="h-1 bg-gradient-to-r from-primary/30 via-transparent to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Roadmap</h2>
        <div className="mt-8 relative">
          {/* Connecting line */}
          <div className="absolute left-6 top-8 bottom-8 w-px bg-border/20" aria-hidden="true" />
          
          <ol className="relative space-y-6">
            {items.map((item, idx) => {
              const config = statusConfig[item.status as keyof typeof statusConfig];
              const Icon = config.icon;
              
              return (
                <li key={idx} className="relative flex items-start gap-4">
                  <div className={`z-10 flex-shrink-0 size-12 rounded-full ${config.bg} border ${config.border} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${config.color}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
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
