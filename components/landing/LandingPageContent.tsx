import dynamic from 'next/dynamic';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import SocialProof from '@/components/landing/SocialProof';
import HowItWorks from '@/components/landing/HowItWorks';
import FinalCTA from '@/components/landing/FinalCTA';

// Lazy load particles background for performance
const LazyParticles = dynamic(() => import('@/components/auth/ParticlesBackground'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
});

export default function LandingPageContent() {
  return (
    <div className="relative min-h-screen">
      {/* Particles background */}
      <LazyParticles density={80} zIndex={0} />
      
      {/* Radial overlay for subtle focus */}
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        <div className="absolute inset-0 opacity-[0.4] bg-[radial-gradient(60%_40%_at_50%_10%,rgba(59,130,246,0.15),transparent_60%)]" />
      </div>

      <main className="relative z-[2]">
        <Hero />
        <Features />
        <SocialProof />
        <HowItWorks />
        <FinalCTA />
      </main>
    </div>
  );
}
