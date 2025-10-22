import { useEffect } from 'react';

export function useOfflineCleanup() {
  useEffect(() => {
    // Run cleanup every 3 seconds to mark inactive users as offline
    const cleanupInterval = setInterval(async () => {
      try {
        await fetch('/api/user/cleanup-offline', { method: 'POST' });
      } catch (error) {
        console.error('🧹 Failed to run offline cleanup:', error);
      }
    }, 3000); // Every 3 seconds

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);
}
