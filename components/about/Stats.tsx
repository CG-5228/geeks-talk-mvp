export default function Stats() {
  const stats = [
    { label: 'Members', value: '2,100+' },
    { label: 'Messages shipped', value: '12.4k' },
    { label: 'Open-source repos', value: '47' },
    { label: 'Countries', value: '23' },
  ];
  
  return (
    <section aria-label="Community stats" className="border-t border-border/20">
      <div className="h-1 bg-gradient-to-r from-primary/30 via-transparent to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div 
              key={s.label} 
              className="relative rounded-xl p-6 bg-card/30 border border-border/20 backdrop-blur-xl text-center"
            >
              <div className="text-3xl font-semibold text-foreground">{s.value}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
