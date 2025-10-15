import { Code2, Database, Palette, Server, Wifi, Layers } from 'lucide-react';

export default function TechStack() {
  const tools = [
    { name: 'Next.js', icon: Code2 },
    { name: 'React', icon: Code2 },
    { name: 'Tailwind CSS', icon: Palette },
    { name: 'Prisma', icon: Layers },
    { name: 'PostgreSQL', icon: Database },
    { name: 'WebRTC', icon: Wifi },
  ];
  
  return (
    <section aria-label="The stack" className="border-t border-border/20">
      <div className="h-1 bg-gradient-to-r from-primary/30 via-transparent to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">The stack</h2>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {tools.map(({ name, icon: Icon }) => (
            <div 
              key={name} 
              className="relative rounded-xl p-4 bg-card/30 border border-border/20 backdrop-blur-xl flex flex-col items-center justify-center text-center gap-3"
            >
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
