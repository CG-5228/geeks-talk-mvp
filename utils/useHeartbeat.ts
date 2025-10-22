import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useHeartbeat() {
  const { data: session } = useSession();
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const isOnline = useRef<boolean>(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Function to send heartbeat
    const sendHeartbeat = async (status: 'online' | 'offline' = 'online') => {
      if (!isOnline.current && status === 'online') return; // Don't send online heartbeat if we're offline
      
      try {
        await fetch('/api/user/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        
        if (status === 'online') {
          isOnline.current = true;
        }
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
        isOnline.current = false;
      }
    };

    // Function to track user activity
    const trackActivity = () => {
      lastActivity.current = Date.now();
      if (!isOnline.current) {
        // User came back online
        isOnline.current = true;
        sendHeartbeat('online');
      }
    };

    // Send initial heartbeat
    sendHeartbeat('online');

    // Set up activity tracking
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, trackActivity, true);
    });

    // Set up heartbeat interval (every 30 seconds)
    heartbeatInterval.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity.current;
      
      // Only send heartbeat if user has been active in the last 2 minutes
      if (timeSinceLastActivity < 2 * 60 * 1000 && isOnline.current) {
        sendHeartbeat('online');
      }
    }, 30000);

    // Handle visibility changes - DISABLED to avoid conflicts with logout handler
    // const handleVisibilityChange = () => {
    //   if (document.visibilityState === 'hidden') {
    //     // Page is hidden, stop sending heartbeats
    //     isOnline.current = false;
    //     if (heartbeatInterval.current) {
    //       clearInterval(heartbeatInterval.current);
    //       heartbeatInterval.current = null;
    //     }
    //   } else {
    //     // Page is visible again, resume heartbeats
    //     isOnline.current = true;
    //     lastActivity.current = Date.now();
    //     sendHeartbeat('online');
        
    //     // Restart heartbeat interval
    //     if (!heartbeatInterval.current) {
    //       heartbeatInterval.current = setInterval(() => {
    //         const timeSinceLastActivity = Date.now() - lastActivity.current;
    //         if (timeSinceLastActivity < 2 * 60 * 1000 && isOnline.current) {
    //           sendHeartbeat('online');
    //         }
    //       }, 30000);
    //     }
    //   }
    // };

    // document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, trackActivity, true);
      });

      // document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Set user as offline when component unmounts
      if (session?.user?.id && isOnline.current) {
        isOnline.current = false;
        fetch('/api/user/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'offline' })
        }).catch(console.error);
      }
    };
  }, [session?.user?.id]);
}
