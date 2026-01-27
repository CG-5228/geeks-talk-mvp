import { Metadata } from 'next';
import HomePageClient from '@/components/landing/HomePageClient';

export const metadata: Metadata = {
  title: 'Geeks Talk - Learn Together. Build Together.',
  description: 'Join the community where developers, students, and tech enthusiasts collaborate, learn, and grow together in real-time. Free forever, no credit card required.',
  keywords: ['developer community', 'tech chat', 'programming help', 'study groups', 'real-time collaboration'],
  openGraph: {
    title: 'Geeks Talk - Learn Together. Build Together.',
    description: 'Join the community where developers, students, and tech enthusiasts collaborate, learn, and grow together in real-time.',
    type: 'website',
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
