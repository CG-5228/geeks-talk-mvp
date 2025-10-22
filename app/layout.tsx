import React from 'react';
import './globals.css';
import Providers from './providers';
import { ThemeProvider } from 'next-themes';
import ThemeColor from '@/components/ThemeColor';
import { NotificationProvider } from '@/components/ui/NotificationSystem';
import LiveSubdomainLayout from '@/components/live/LiveSubdomainLayout';
import SessionSharer from '@/components/auth/SessionSharer';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full" suppressHydrationWarning>
            <head>
                {/* theme-color is updated dynamically by ThemeColor */}
                <meta name="theme-color" content="#0d0f10" />
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