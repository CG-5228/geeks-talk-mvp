import Link from 'next/link';

export default function CTA() {
  return (
    <section aria-label="Build with us" className="border-t border-border/20">
      <div className="h-1 bg-gradient-to-r from-primary/30 via-transparent to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground">Build with us</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Bring your project, find your people, and level up.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link 
              href="/live" 
              className="rounded-md px-6 py-3 bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.32)] hover:shadow-[0_0_26px_hsl(var(--primary)/0.5)] transition font-medium"
            >
              Open Live
            </Link>
            <Link 
              href="/signup" 
              className="rounded-md px-6 py-3 border border-border/20 bg-card/30 backdrop-blur-xl hover:bg-card/50 transition font-medium text-foreground"
            >
              Sign up
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            No spam. Community-moderated.
          </p>
        </div>
      </div>
    </section>
  );
}
