import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import Hero from '@/components/about/Hero';
import ValuePills from '@/components/about/ValuePills';
import HowItWorks from '@/components/about/HowItWorks';
import Stats from '@/components/about/Stats';
import Roadmap from '@/components/about/Roadmap';
import TechStack from '@/components/about/TechStack';
import CTA from '@/components/about/CTA';

export const metadata: Metadata = {
  title: 'About • Geeks Talk',
  description:
    'Geeks Talk is a live study hall for builders and learners. Join subject hubs, get realtime help, and unlock voice rooms to learn out loud.',
  openGraph: {
    title: 'About • Geeks Talk',
    description:
      'A community where programmers, students, and researchers swap ideas, fix bugs together, and learn out loud.',
    url: 'https://geekstalk.local/about',
    type: 'website',
  },
};

const LazyParticles = dynamic(() => import('@/components/auth/ParticlesBackground'), {
  ssr: false,
});

export default function AboutPage() {
  return (
    <div className="relative">
  {/* Lighter particles for About (client-only component, dynamically loaded) */}
  <LazyParticles density={70} zIndex={0} />
      {/* Radial overlay for subtle focus */}
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(60%_40%_at_50%_10%,rgba(255,255,255,0.12),transparent_60%)]" />
      </div>

      <main className="relative z-[2]">
        <Hero />
        <section className="border-t border-[color:var(--nav-border)]/20" aria-label="Mission">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[rgba(236,245,255,0.95)]">Why we exist</h2>
              <p className="mt-3 text-[rgba(220,235,255,0.85)]">
                We believe great work happens in public. Geeks Talk turns solitary grind into collaborative
                momentum—fast answers, generous peers, and a welcoming place to ship your next win.
              </p>
            </div>
          </div>
        </section>

        <HowItWorks />
        <ValuePills />
        <Stats />
        <Roadmap />
        <TechStack />
        <CTA />
      </main>
    </div>
  );
}
