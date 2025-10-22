'use client';
import { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Filter,
  Search,
  Eye,
  EyeOff,
  MessageSquare,
  Shield
} from 'lucide-react';
import ReviewModal from './ReviewModal';
import ReplyModal from './ReplyModal';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    [key: string]: number;
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState<{ open: boolean; reportId?: string }>()
  const [replying, setReplying] = useState<{ open: boolean; userId?: string; userName?: string; originalMessage?: string }>()
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
      setStats(data.stats || { total: 0, unread: 0, byType: {} });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/admin/notifications', {
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
      
      // Update stats
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - notificationIds.length)
      }));
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
        return <Send className="h-5 w-5 text-blue-400" />;
      case 'ban':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'system':
        return <Bell className="h-5 w-5 text-yellow-400" />;
      case 'user_report':
        return <Users className="h-5 w-5 text-orange-400" />;
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
      case 'user_report':
        return 'border-orange-500/20 bg-orange-500/10';
      default:
        return 'border-gray-500/20 bg-gray-500/10';
    }
  };
  
  const filteredNotifications = notifications.filter(notif => {
    const matchesFilter = filter === 'all' || 
      (filter === 'unread' && !notif.read) || 
      (filter === 'read' && notif.read);
    
    const matchesType = typeFilter === 'all' || notif.type === typeFilter;
    
    const matchesSearch = searchTerm === '' || 
      notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesType && matchesSearch;
  });
  
  const uniqueTypes = Array.from(new Set(notifications.map(n => n.type)));
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const openReview = async (reportId?: string) => {
    if (!reportId) return;
    setReviewing({ open: true, reportId });
  };
  const openReply = (userId?: string, userName?: string, originalMessage?: string) => {
    if (!userId) return;
    setReplying({ open: true, userId, userName, originalMessage });
  };
  
  return (
    <div className="p-6">
      <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Notification Center</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-white/70">
              {stats.total} total • {stats.unread} unread
            </div>
            {stats.unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-3 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Mark All Read
              </button>
            )}
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-white/70">Total</div>
          </div>
          <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
            <div className="text-2xl font-bold text-red-400">{stats.unread}</div>
            <div className="text-sm text-white/70">Unread</div>
          </div>
          <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{stats.total - stats.unread}</div>
            <div className="text-sm text-white/70">Read</div>
          </div>
          <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{uniqueTypes.length}</div>
            <div className="text-sm text-white/70">Types</div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        
        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
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
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead([notification.id])}
                          className="p-1 text-white/50 hover:text-white transition-colors"
                          title="Mark as read"
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>
                      )}
                      {notification.read && (
                        <button
                          onClick={() => markAsRead([notification.id])}
                          className="p-1 text-white/50 hover:text-white transition-colors"
                          title="Mark as unread"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {notification.type === 'user_report' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openReview((notification as any).metadata?.reportId)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="Review Details"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openReply((notification as any).metadata?.reporterId, notification.user?.name, notification.message)}
                            className="p-2 rounded-lg bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 text-white transition-colors"
                            title="Reply"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm mb-3 ${
                    !notification.read ? 'text-white/90' : 'text-white/70'
                  }`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      </div>
                      {notification.user && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{notification.user.name}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 bg-white/10 rounded">
                      {notification.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No notifications found</h3>
            <p className="text-white/70">
              {searchTerm || filter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filters.' 
                : 'No notifications have been created yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewing?.open && (
        <ReviewModal reportId={reviewing.reportId!} onClose={() => setReviewing({ open: false })} />
      )}

      {/* Reply Modal */}
      {replying?.open && (
        <ReplyModal 
          userId={replying.userId!} 
          userName={replying.userName} 
          originalMessage={replying.originalMessage}
          onClose={() => setReplying({ open: false })} 
        />
      )}
    </div>
  );
}