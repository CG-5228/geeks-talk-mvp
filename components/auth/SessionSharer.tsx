"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRobustOfflineDetection } from '@/utils/useRobustOfflineDetection';
import { useOfflineCleanup } from '@/utils/useOfflineCleanup';

export default function SessionSharer() {
  const { data: session, status } = useSession();

  // Handle robust offline detection for all scenarios
  useRobustOfflineDetection();

  // Run periodic cleanup to mark inactive users as offline
  useOfflineCleanup();

  useEffect(() => {
    if (status === 'loading') return;

    const currentHost = window.location.host;
    const isLiveSubdomain = currentHost.startsWith('live.');

    if (session && !isLiveSubdomain) {
      // On main domain, store session data for cross-subdomain access
      const sessionData = {
        user: session.user,
        expires: session.expires,
        timestamp: Date.now()
      };

      // Store in sessionStorage (shared across tabs of same origin)
      sessionStorage.setItem('geeks-talk-session', JSON.stringify(sessionData));

      // Store in localStorage for cross-origin access
      localStorage.setItem('geeks-talk-session-transfer', JSON.stringify(sessionData));

      // Try to set cookies with different domain configurations
      const cookieValue = btoa(JSON.stringify(sessionData)); // Base64 encode
      document.cookie = `geeks-talk-session=${cookieValue}; path=/; max-age=3600; SameSite=Lax`;
      document.cookie = `geeks-talk-session=${cookieValue}; path=/; max-age=3600; SameSite=Lax; domain=localhost`;
      document.cookie = `geeks-talk-session=${cookieValue}; path=/; max-age=3600; SameSite=Lax; domain=.localhost`;

      // Also trigger heartbeat immediately to ensure user is marked as online
      fetch('/api/user/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'online' })
      }).then(response => {
        console.log('💓 Initial heartbeat sent from main domain:', response.ok);
      }).catch(error => {
        console.error('Failed to send initial heartbeat:', error);
      });

    } else if (!session && isLiveSubdomain) {
      // On live subdomain, try to get session from various sources

      // First try URL parameters (from transfer)
      const urlParams = new URLSearchParams(window.location.search);
      const sessionParam = urlParams.get('session');
      if (sessionParam) {
        try {
          const sessionData = JSON.parse(atob(sessionParam));
          if (sessionData.expires && new Date(sessionData.expires) > new Date()) {

            // Store in sessionStorage and cookie for future use
            sessionStorage.setItem('geeks-talk-session', JSON.stringify(sessionData));
            localStorage.setItem('geeks-talk-session-transfer', JSON.stringify(sessionData));
            const cookieValue = btoa(JSON.stringify(sessionData));
            document.cookie = `geeks-talk-session=${cookieValue}; path=/; max-age=3600; SameSite=Lax`;

            // Trigger heartbeat to mark user as online on live subdomain
            fetch('/api/user/heartbeat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'online' })
            }).then(response => {
              console.log('💓 Heartbeat sent on live subdomain (URL):', response.ok);
            }).catch(error => {
              console.error('Failed to send heartbeat on live subdomain:', error);
            });

            // Clean up URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('session');
            window.history.replaceState({}, '', newUrl.toString());
            return;
          }
        } catch (error) {
          console.error('Failed to parse shared session from URL parameters:', error);
        }
      }

      // Try sessionStorage
      const sharedSession = sessionStorage.getItem('geeks-talk-session');
      if (sharedSession) {
        try {
          const sessionData = JSON.parse(sharedSession);
          if (sessionData.expires && new Date(sessionData.expires) > new Date()) {

            return;
          }
        } catch (error) {
          console.error('Failed to parse shared session from sessionStorage:', error);
        }
      }

      // Try to get from cookie
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('geeks-talk-session='));
      if (sessionCookie) {
        try {
          const cookieValue = sessionCookie.split('=')[1];
          const sessionData = JSON.parse(atob(cookieValue)); // Base64 decode
          if (sessionData.expires && new Date(sessionData.expires) > new Date()) {

            // Store in sessionStorage for future use
            sessionStorage.setItem('geeks-talk-session', JSON.stringify(sessionData));
            return;
          }
        } catch (error) {
          console.error('Failed to parse shared session from cookie:', error);
        }
      }

      // Try localStorage transfer mechanism
      const transferSession = localStorage.getItem('geeks-talk-session-transfer');
      if (transferSession) {
        try {
          const sessionData = JSON.parse(transferSession);
          if (sessionData.expires && new Date(sessionData.expires) > new Date()) {

            // Store in sessionStorage and cookie for future use
            sessionStorage.setItem('geeks-talk-session', JSON.stringify(sessionData));
            const cookieValue = btoa(JSON.stringify(sessionData));
            document.cookie = `geeks-talk-session=${cookieValue}; path=/; max-age=3600; SameSite=Lax`;
            
            // Trigger heartbeat to mark user as online
            fetch('/api/user/heartbeat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'online' })
            }).then(response => {
              console.log('💓 Heartbeat sent on live subdomain (localStorage):', response.ok);
            }).catch(error => {
              console.error('Failed to send heartbeat on live subdomain:', error);
            });
            return;
          }
        } catch (error) {
          console.error('Failed to parse shared session from localStorage transfer:', error);
        }
      }

    }
  }, [session, status]);

  return null; // This component doesn't render anything
}
