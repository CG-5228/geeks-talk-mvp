"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';

const Particles = dynamic(() => import('@/components/auth/ParticlesBackground'), { ssr: false });

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-[1]">
        {/* lighter particles handled via page wrapper */}
      </div>
      <div className="relative">
        <div className="px-4 sm:px-6 lg:px-8 pt-20 pb-14 sm:pt-24 sm:pb-20">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[rgba(236,245,255,0.98)]">
              Geeks Talk
            </h1>
            <p className="mt-3 text-xl text-[rgba(220,235,255,0.9)]">
              A live study hall for builders and learners.
            </p>
            <p className="mt-4 text-[rgba(220,235,255,0.85)]">
              Geeks Talk is a community where programmers, students, researchers and tech lovers swap ideas, fix bugs together,
              and learn out loud. Jump into a subject room, ask for help, or spin up a live voice session when text isn’t enough.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const { protocol, host } = window.location;
                  let target = `${protocol}//live.${host}/text`;
                  if (host.includes('localhost')) {
                    const port = host.split(':')[1] ? `:${host.split(':')[1]}` : '';
                    target = `${protocol}//live.localhost${port}/text`;
                  }
                  if (host.startsWith('live.')) {
                    target = `${protocol}//${host}/text`;
                  }
                  window.location.href = target;
                }}
                aria-label="Get Started on Live"
                className="rounded-md px-5 py-2.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_18px_hsla(var(--primary)/0.32)] hover:shadow-[0_0_26px_hsla(var(--primary)/0.5)] transition"
              >
                Get Started
              </button>
              <Link href="/about#roadmap" aria-label="View Roadmap" className="rounded-md px-5 py-2.5 ring-1 ring-[color:var(--card-ring)] bg-[color:var(--card-bg)]/60 backdrop-blur-xl hover:bg-[color:var(--card-bg)]/80 transition">
                View Roadmap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
