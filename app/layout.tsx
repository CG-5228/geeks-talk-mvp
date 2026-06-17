import React from 'react';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});
import { ThemeProvider } from 'next-themes';
import ThemeColor from '@/components/ThemeColor';
import { NotificationProvider } from '@/components/ui/NotificationSystem';
import LiveSubdomainLayout from '@/components/live/LiveSubdomainLayout';
import SessionSharer from '@/components/auth/SessionSharer';

const siteUrl = process.env.NEXTAUTH_URL || 'https://geekstalk.org';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Geeks Talk - Learn Together. Build Together.',
    template: '%s | Geeks Talk',
  },
  applicationName: 'Geeks Talk',
  description: 'Join the community where developers, students, and tech enthusiasts collaborate, learn, and grow together in real-time.',
  // Let Next.js auto-detect favicon from app/favicon.ico and app/apple-icon.png
  openGraph: {
    siteName: 'Geeks Talk',
    title: 'Geeks Talk - Learn Together. Build Together.',
    description: 'Join the community where developers, students, and tech enthusiasts collaborate in real-time.',
    type: 'website',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Geeks Talk - Learn Together. Build Together.',
  },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Geeks Talk',
    alternateName: 'geekstalk.org',
    url: siteUrl,
    description: 'Join the community where developers, students, and tech enthusiasts collaborate in real-time.',
  };

    return (
        <html lang="en" className={`h-full ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
            <head>
                {/* theme-color is updated dynamically by ThemeColor */}
                <meta name="theme-color" content="#0d0f10" />
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body className="min-h-screen flex flex-col">
                <ThemeProvider
                    attribute="data-theme"
                    defaultTheme="black"
                    enableSystem={false}
                    storageKey="geekstalk-theme"
                    disableTransitionOnChange
                >
                    <NotificationProvider>
                        <Providers>
                            <SessionSharer />
                            <ThemeColor />
                            <LiveSubdomainLayout>
                                {children}
                            </LiveSubdomainLayout>
                        </Providers>
                    </NotificationProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}