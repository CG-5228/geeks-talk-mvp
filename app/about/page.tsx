import type { Metadata } from 'next';
import Hero from '@/components/about/Hero';
import ValuePills from '@/components/about/ValuePills';
import HowItWorks from '@/components/about/HowItWorks';
import Stats from '@/components/about/Stats';
import Roadmap from '@/components/about/Roadmap';
import TechStack from '@/components/about/TechStack';
import CTA from '@/components/about/CTA';
import ParticlesBackgroundClient from '@/components/auth/ParticlesBackgroundClient';

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

export default function AboutPage() {
  return (
    <div className="relative">
      <ParticlesBackgroundClient density={70} zIndex={0} />
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(60%_40%_at_50%_10%,rgba(255,255,255,0.12),transparent_60%)]" />
      </div>

      <main className="relative z-[2]">
        <Hero />

        <section aria-label="Mission" className="relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-3xl">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[color:hsl(var(--primary))]">
                Our mission
              </p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-[rgba(236,245,255,0.98)]">
                Great work happens in public.
              </h2>
              <p className="mt-5 text-lg text-[rgba(220,235,255,0.8)] leading-relaxed">
                Geeks Talk turns solitary grind into collaborative momentum — fast answers, generous peers, and a welcoming place to ship your next win. We&apos;re building the space we wish existed when we were stuck on our first bug at 2am.
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
