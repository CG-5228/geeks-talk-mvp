import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useAggressiveHeartbeat() {
  const { data: session } = useSession();
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const lastActivity = useRef<number>(Date.now());

  useEffect(() => {
    if (!session?.user?.id) return;

    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/user/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'online' })
        });

        if (response.ok) {
          lastActivity.current = Date.now();

        }
      } catch (error) {
        console.error('💓 Heartbeat failed:', error);
      }
    };

    const trackActivity = () => {
      lastActivity.current = Date.now();
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up activity tracking
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, trackActivity, true);
    });

    // Set up aggressive heartbeat interval (every 5 seconds)
    heartbeatInterval.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity.current;

      // Send heartbeat if user has been active in the last 30 seconds
      if (timeSinceLastActivity < 30 * 1000) {
        sendHeartbeat();
      }
    }, 5000); // Every 5 seconds

    // Cleanup function
    return () => {

      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }

      events.forEach(event => {
        document.removeEventListener(event, trackActivity, true);
      });
    };
  }, [session?.user?.id]);
}
