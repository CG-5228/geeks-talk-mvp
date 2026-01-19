"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LiveNavbar from './LiveNavbar';
import Header from '../Header';
import { useStyledDialog } from '../ui/StyledDialog';
import SiteAnnouncementProvider from '../SiteAnnouncementProvider';

interface LiveSubdomainLayoutProps {
  children: React.ReactNode;
}

export default function LiveSubdomainLayout({ children }: LiveSubdomainLayoutProps) {
  const [isLiveSubdomain, setIsLiveSubdomain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const { showDialog, DialogComponent } = useStyledDialog();

  useEffect(() => {
    // Check if we're on a live subdomain
    const hostname = window.location.hostname;
    const isLive = hostname.startsWith('live.');
    // #region agent log
    console.log('[LiveLayout] Hostname check:', {
      hostname,
      isLive,
      willRenderBanner: isLive,
    });
    // #endregion
    setIsLiveSubdomain(isLive);
    setIsLoading(false);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bb9359b2-0268-40e1-8961-bb0e3cf8ee2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'components/live/LiveSubdomainLayout.tsx:mount',
        message: 'Live subdomain detection',
        data: { hostname, isLive },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogoClick = () => {
    showDialog({
      title: 'Return to Main Site',
      message: 'Do you want to return to the main Geeks Talk website?',
      type: 'info',
      isConfirm: true,
      confirmText: 'Yes, Go Back',
      cancelText: 'Stay Here',
      onConfirm: () => {
        // Determine the main domain URL
        const currentHost = window.location.host;
        const mainHost = currentHost.includes('localhost')
          ? 'localhost:3000'
          : currentHost.replace(/^live\./, '');
        window.location.href = `${window.location.protocol}//${mainHost}`;
      },
      onCancel: () => {
        // Do nothing, stay on live subdomain
      }
    });
  };

  if (isLiveSubdomain) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] flex flex-col">
        <LiveNavbar onLogoClick={handleLogoClick} />
        <SiteAnnouncementProvider scope="live" />
        <main className="flex-1 w-full">{children}</main>
        <DialogComponent />
      </div>
    );
  }

  // For non-subdomain access, use regular layout
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SiteAnnouncementProvider scope="main" />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
