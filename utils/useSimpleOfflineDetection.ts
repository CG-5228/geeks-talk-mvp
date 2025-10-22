import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useSimpleOfflineDetection() {
  const { data: session } = useSession();
  const hasSetOffline = useRef(false);
  const offlineTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    console.log('🚀 Simple offline detection started for user:', session.user.id);
    hasSetOffline.current = false;

    const setUserOffline = () => {
      if (hasSetOffline.current) {
        console.log('🚪 Already set offline, skipping');
        return;
      }
      
      hasSetOffline.current = true;
      console.log('🚪 Setting user offline:', session.user.id);

      // Clear any pending timeout
      if (offlineTimeout.current) {
        clearTimeout(offlineTimeout.current);
        offlineTimeout.current = null;
      }

      // Try multiple methods to ensure the request goes through
      const userId = session.user.id;
      
      // Method 1: sendBeacon (most reliable for page unload)
      if (navigator.sendBeacon) {
        const formData = new FormData();
        formData.append('userId', userId);
        const beaconResult = navigator.sendBeacon('/api/user/set-offline', formData);
        console.log('📤 SendBeacon to set-offline result:', beaconResult);
      }

      // Method 2: sendBeacon to logout endpoint (backup)
      if (navigator.sendBeacon) {
        const formData2 = new FormData();
        formData2.append('userId', userId);
        const beaconResult2 = navigator.sendBeacon('/api/user/logout', formData2);
        console.log('📤 SendBeacon to logout result:', beaconResult2);
      }

      // Method 3: fetch with keepalive (backup)
      fetch('/api/user/set-offline', {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      }).then(() => {
        console.log('📤 Fetch set-offline successful');
      }).catch((error) => {
        console.error('📤 Fetch set-offline failed:', error);
      });

      // Method 4: fetch to logout endpoint (backup)
      fetch('/api/user/logout', {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      }).then(() => {
        console.log('📤 Fetch logout successful');
      }).catch((error) => {
        console.error('📤 Fetch logout failed:', error);
      });
    };

    const handleVisibilityChange = () => {
      console.log('👁️ Visibility changed to:', document.visibilityState);
      if (document.visibilityState === 'hidden') {
        // Clear any existing timeout
        if (offlineTimeout.current) {
          clearTimeout(offlineTimeout.current);
        }
        // Set offline immediately when page becomes hidden
        setUserOffline();
      } else {
        hasSetOffline.current = false;
        console.log('🟢 User back online');
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('🚪 Before unload triggered');
      setUserOffline();
      // Don't prevent the unload, just set offline
    };

    const handlePageHide = () => {
      console.log('🚪 Page hide triggered');
      setUserOffline();
    };

    const handleUnload = () => {
      console.log('🚪 Unload triggered');
      setUserOffline();
    };

    const handleFocus = () => {
      console.log('🎯 Window focused');
      hasSetOffline.current = false;
    };

    const handleBlur = () => {
      console.log('😴 Window blurred');
      // Set offline after a short delay when window loses focus
      if (offlineTimeout.current) {
        clearTimeout(offlineTimeout.current);
      }
      offlineTimeout.current = setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          setUserOffline();
        }
      }, 1000); // 1 second delay
    };

    // Add all event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up simple offline detection');
      
      if (offlineTimeout.current) {
        clearTimeout(offlineTimeout.current);
      }
      
      setUserOffline();
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [session?.user?.id]);
}
