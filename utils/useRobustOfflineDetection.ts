import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useRobustOfflineDetection() {
  const { data: session } = useSession();
  const hasSetOffline = useRef(false);
  const lastHeartbeat = useRef<number>(Date.now());
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const offlineTimeout = useRef<NodeJS.Timeout | null>(null);
  const isPageVisible = useRef<boolean>(true);

  // Function to send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!session?.user?.id || hasSetOffline.current) return;

    try {
      const response = await fetch('/api/user/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'online' })
      });

      if (response.ok) {
        lastHeartbeat.current = Date.now();

      }
    } catch (error) {
      console.error('💓 Heartbeat failed:', error);
    }
  }, [session?.user?.id]);

  // Function to set user offline
  const setUserOffline = useCallback(() => {
    if (hasSetOffline.current || !session?.user?.id) return;

    hasSetOffline.current = true;

    // Clear any pending timeouts
    if (offlineTimeout.current) {
      clearTimeout(offlineTimeout.current);
      offlineTimeout.current = null;
    }

    // Use sendBeacon for reliable delivery
    if (navigator.sendBeacon) {
      const data = new FormData();
      data.append('method', 'POST');
      const success = navigator.sendBeacon('/api/user/logout', data);

    } else {
      // Fallback using fetch with keepalive
      fetch('/api/user/logout', {
        method: 'POST',
        keepalive: true
      }).then(() => {

      }).catch((error) => {
        console.error('📤 Failed to send offline status:', error);
      });
    }
  }, [session?.user?.id]);

  // Function to set user online
  const setUserOnline = useCallback(() => {
    if (!session?.user?.id) return;

    hasSetOffline.current = false;

    // Send immediate heartbeat
    sendHeartbeat();
  }, [session?.user?.id, sendHeartbeat]);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Reset state when session changes
    hasSetOffline.current = false;
    lastHeartbeat.current = Date.now();
    isPageVisible.current = true;

    // Send initial heartbeat
    sendHeartbeat();

    // Set up heartbeat interval (every 15 seconds)
    heartbeatInterval.current = setInterval(() => {
      if (isPageVisible.current && !hasSetOffline.current) {
        sendHeartbeat();
      }
    }, 15000);

    // Page visibility change handler
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';

      isPageVisible.current = isVisible;

      if (isVisible) {
        // Page became visible - user is back online
        setUserOnline();
      } else {
        // Page became hidden - set offline after short delay
        if (offlineTimeout.current) {
          clearTimeout(offlineTimeout.current);
        }
        offlineTimeout.current = setTimeout(() => {
          if (!isPageVisible.current) {
            setUserOffline();
          }
        }, 2000); // 2 second delay
      }
    };

    // Page unload handlers
    const handleBeforeUnload = () => {

      setUserOffline();
    };

    const handlePageHide = () => {

      setUserOffline();
    };

    const handleUnload = () => {

      setUserOffline();
    };

    // Focus/blur handlers for additional detection
    const handleFocus = () => {

      if (isPageVisible.current) {
        setUserOnline();
      }
    };

    const handleBlur = () => {

      // Set offline after delay if page is not visible
      if (offlineTimeout.current) {
        clearTimeout(offlineTimeout.current);
      }
      offlineTimeout.current = setTimeout(() => {
        if (!isPageVisible.current) {
          setUserOffline();
        }
      }, 3000); // 3 second delay for blur
    };

    // Network status handler
    const handleOnline = () => {

      if (isPageVisible.current) {
        setUserOnline();
      }
    };

    const handleOffline = () => {

      setUserOffline();
    };

    // Add all event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup function
    return () => {

      // Clear intervals and timeouts
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (offlineTimeout.current) {
        clearTimeout(offlineTimeout.current);
      }

      // Set user offline on cleanup
      setUserOffline();

      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session?.user?.id, sendHeartbeat, setUserOffline, setUserOnline]);

  // Return cleanup function for manual use
  return { setUserOffline, setUserOnline };
}
