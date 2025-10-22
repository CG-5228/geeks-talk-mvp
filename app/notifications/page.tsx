'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Mail, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session]);
  
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/user/notifications');
      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds,
          read: true
        })
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notificationIds.includes(notif.id) 
            ? { ...notif, read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };
  
  const markAllAsRead = () => {
    const unreadIds = notifications
      .filter(notif => !notif.read)
      .map(notif => notif.id);
    
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'admin_message':
        return <Mail className="h-5 w-5 text-blue-400" />;
      case 'ban':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'system':
        return <Bell className="h-5 w-5 text-yellow-400" />;
      default:
        return <Bell className="h-5 w-5 text-gray-400" />;
    }
  };
  
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'admin_message':
        return 'border-blue-500/20 bg-blue-500/10';
      case 'ban':
        return 'border-red-500/20 bg-red-500/10';
      case 'system':
        return 'border-yellow-500/20 bg-yellow-500/10';
      default:
        return 'border-gray-500/20 bg-gray-500/10';
    }
  };
  
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-white/70">Please sign in to view your notifications.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-white/70">Loading notifications...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
            <p className="text-white/70">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Mark All Read
            </button>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No notifications yet</h3>
            <p className="text-white/70">You'll see important updates and messages here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 rounded-lg border ${getNotificationColor(notification.type)} ${
                  !notification.read ? 'ring-2 ring-[#00d9ff]/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-semibold ${
                        !notification.read ? 'text-white' : 'text-white/80'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead([notification.id])}
                          className="p-1 text-white/50 hover:text-white transition-colors"
                          title="Mark as read"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className={`text-sm mb-3 ${
                      !notification.read ? 'text-white/90' : 'text-white/70'
                    }`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                      {notification.type === 'ban' && notification.metadata && (
                        <span className="text-xs text-red-400">
                          Expires: {new Date(notification.metadata.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
