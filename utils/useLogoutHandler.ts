import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useLogoutHandler() {
  const { data: session } = useSession();
  const hasSetOffline = useRef(false);
  const offlineTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Reset the flag when session changes
    hasSetOffline.current = false;

    const setUserOffline = () => {
      if (hasSetOffline.current) return; // Prevent duplicate calls
      hasSetOffline.current = true;

      console.log('🚪 Setting user offline:', session.user.id);

      // Use sendBeacon for reliable delivery even when page is unloading
      if (navigator.sendBeacon) {
        const data = new FormData();
        data.append('method', 'POST');
        const success = navigator.sendBeacon('/api/user/logout', data);
        console.log('📤 SendBeacon result:', success);
      } else {
        // Fallback for browsers that don't support sendBeacon
        fetch('/api/user/logout', { 
          method: 'POST',
          keepalive: true 
        }).then(() => {
          console.log('📤 Sent offline status via fetch');
        }).catch((error) => {
          console.error('Failed to update status on page unload:', error);
        });
      }
    };

    const handleBeforeUnload = () => {
      console.log('🚪 beforeunload event triggered');
      setUserOffline();
    };

    const handlePageHide = () => {
      console.log('🚪 pagehide event triggered');
      setUserOffline();
    };

    const handleVisibilityChange = () => {
      console.log('🚪 visibilitychange event triggered, state:', document.visibilityState);
      if (document.visibilityState === 'hidden') {
        // Clear any existing timeout
        if (offlineTimeout.current) {
          clearTimeout(offlineTimeout.current);
        }
        // Set offline immediately when page becomes hidden
        setUserOffline();
      } else {
        // Reset the flag when user comes back to the page
        hasSetOffline.current = false;
      }
    };

    const handleFocus = () => {
      console.log('🚪 focus event triggered');
      // Reset the flag when user comes back to the page
      hasSetOffline.current = false;
    };

    const handleBlur = () => {
      console.log('🚪 blur event triggered');
      // Set offline when window loses focus with a small delay
      if (offlineTimeout.current) {
        clearTimeout(offlineTimeout.current);
      }
      offlineTimeout.current = setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          setUserOffline();
        }
      }, 500); // Shorter delay
    };

    // Listen for various page unload and visibility events
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('unload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Also handle when the component unmounts (e.g., navigation)
    return () => {
      console.log('🚪 Component unmounting, setting offline');
      setUserOffline();
      
      if (offlineTimeout.current) {
        clearTimeout(offlineTimeout.current);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('unload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [session?.user?.id]);
}

