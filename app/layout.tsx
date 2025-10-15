import React from 'react';
import './globals.css';
import Header from '../components/Header';
import Providers from './providers';
import { ThemeProvider } from 'next-themes';
import ThemeColor from '@/components/ThemeColor';

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
                    <Providers>
                        <Header />
                        <ThemeColor />
                        <main className="flex-1 w-full">{children}</main>
                    </Providers>
                </ThemeProvider>
            </body>
        </html>
    );
}