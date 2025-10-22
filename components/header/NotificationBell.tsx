'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/user/notifications');
      const data = await response.json();
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <Bell className="h-5 w-5 text-white/70" />
      </div>
    );
  }
  
  return (
    <Link 
      href="/notifications" 
      className={`relative ${className} group`}
      title="Notifications"
    >
      <Bell className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
