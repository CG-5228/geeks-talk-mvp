import type { Metadata } from 'next';
import BlogList from '@/components/blog/BlogList';
import ParticlesBackgroundClient from '@/components/auth/ParticlesBackgroundClient';

export const metadata: Metadata = {
  title: 'Blog • Geeks Talk',
  description:
    'Read the latest articles, tutorials, and updates from the Geeks Talk community. Learn about programming, tech, and more.',
  openGraph: {
    title: 'Blog • Geeks Talk',
    description:
      'Read the latest articles, tutorials, and updates from the Geeks Talk community.',
    url: 'https://geekstalk.org/blog',
    type: 'website',
  },
};

export default function BlogPage() {
  return (
    <div className="relative min-h-screen">
      {/* Background particles */}
      <ParticlesBackgroundClient density={50} zIndex={0} />
      
      {/* Radial overlay for subtle focus */}
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(60%_40%_at_50%_10%,rgba(255,255,255,0.12),transparent_60%)]" />
      </div>

      <main className="relative z-[2]">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 pt-20 pb-10 sm:pt-24 sm:pb-14">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[rgba(236,245,255,0.98)]">
              Blog
            </h1>
            <p className="mt-4 text-xl text-[rgba(220,235,255,0.85)]">
              Articles, tutorials, and updates from the community
            </p>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-6xl mx-auto">
            <BlogList />
          </div>
        </section>
      </main>
    </div>
  );
}
