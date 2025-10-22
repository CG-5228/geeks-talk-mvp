'use client';
import { useState, useEffect } from 'react';
import { 
  Search, 
  Ban, 
  Mail, 
  Trash2, 
  Edit, 
  UserCheck, 
  UserX,
  Clock,
  MessageSquare,
  Mic,
  Activity,
  X,
  AlertTriangle,
  Send,
  Calendar,
  Shield,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Info,
  AlertCircle,
  History,
  FileText,
  Settings
} from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  createdAt: string;
  onlineStatus: 'online' | 'offline';
  lastSeen?: string;
  activity?: {
    totalMessages: number;
    voiceMinutes: number;
    totalOnlineTime: number;
  };
  likesCount: number;
  bans?: Array<{
    id: string;
    reason: string;
    expiresAt: string;
    createdAt: string;
    bannedBy: string;
  }>;
  reports?: Array<{
    id: string;
    reason: string;
    createdAt: string;
    reportedBy: string;
  }>;
  kicks?: Array<{
    id: string;
    reason: string;
    createdAt: string;
    kickedBy: string;
  }>;
}

interface UserTableProps {
  className?: string;
}

export default function UserTable({ className = '' }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banData, setBanData] = useState({ 
    userId: '', 
    reason: '', 
    days: 1, 
    sendEmail: true,
    notifyUser: true 
  });
  const [messageData, setMessageData] = useState({ 
    userId: '', 
    subject: '', 
    message: '',
    sendEmail: true,
    priority: 'normal'
  });
  const [deleteData, setDeleteData] = useState({
    userId: '',
    confirmText: '',
    deleteMessages: false,
    deleteFiles: false,
    sendNotification: true
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleBanUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${banData.userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: banData.reason,
          duration: banData.days,
          sendEmail: banData.sendEmail,
          notifyUser: banData.notifyUser
        })
      });
      
      if (response.ok) {
        alert('User banned successfully!');
        setShowBanModal(false);
        setBanData({ userId: '', reason: '', days: 1, sendEmail: true, notifyUser: true });
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Failed to ban user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user. Please try again.');
    }
  };
  
  const handleSendMessage = async () => {
    try {
      const response = await fetch(`/api/admin/users/${messageData.userId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: messageData.subject,
          message: messageData.message,
          sendEmail: messageData.sendEmail,
          priority: messageData.priority
        })
      });
      
      if (response.ok) {
        alert('Message sent successfully!');
        setShowMessageModal(false);
        setMessageData({ userId: '', subject: '', message: '', sendEmail: true, priority: 'normal' });
      } else {
        const errorData = await response.json();
        alert(`Failed to send message: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };
  
  const handleDeleteUser = async () => {
    if (deleteData.confirmText !== 'DELETE') {
      alert('Please type "DELETE" to confirm user deletion.');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: deleteData.userId,
          deleteMessages: deleteData.deleteMessages,
          deleteFiles: deleteData.deleteFiles,
          sendNotification: deleteData.sendNotification
        })
      });
      
      if (response.ok) {
        alert('User deleted successfully!');
        setShowDeleteModal(false);
        setDeleteData({ userId: '', confirmText: '', deleteMessages: false, deleteFiles: false, sendNotification: true });
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const openUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
  };
  
  const filteredUsers = users.filter(user =>
    (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );
  
  if (loading) {
    return (
      <div className={`bg-white/5 border border-white/10 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white/5 border border-white/10 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">User Management</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20">
              <th className="text-left py-3 px-4 text-white/70 font-medium">User</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Activity</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Likes</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Joined</th>
              <th className="text-left py-3 px-4 text-white/70 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium text-white">{user.name || user.username || 'Anonymous'}</div>
                    <div className="text-sm text-white/70">{user.email}</div>
                    {user.username && user.name && (
                      <div className="text-sm text-white/50">@{user.username}</div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {user.onlineStatus === 'online' ? (
                      <UserCheck className="h-4 w-4 text-green-400" />
                    ) : (
                      <UserX className="h-4 w-4 text-white/50" />
                    )}
                    <span className={`text-sm ${
                      user.onlineStatus === 'online' ? 'text-green-400' : 'text-white/70'
                    }`}>
                      {user.onlineStatus}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  {user.activity && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm text-white/70">
                        <MessageSquare className="h-3 w-3" />
                        <span>{user.activity.totalMessages}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-white/70">
                        <Mic className="h-3 w-3" />
                        <span>{user.activity.voiceMinutes}m</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-white/70">
                        <Activity className="h-3 w-3" />
                        <span>{user.activity.totalOnlineTime}m</span>
                      </div>
                    </div>
                  )}
                </td>
                <td className="py-4 px-4">
                  <span className="text-white">{user.likesCount}</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1 text-sm text-white/70">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openUserDetails(user)}
                      className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {user.bans && user.bans.length > 0 ? (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/users/${user.id}/ban`, { method: 'DELETE' });
                            if (res.ok) {
                              alert('User unbanned');
                              fetchUsers();
                            } else {
                              const e = await res.json();
                              alert(e.error || 'Failed to unban');
                            }
                          } catch {
                            alert('Failed to unban');
                          }
                        }}
                        className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                        title="Unban user"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setBanData({ ...banData, userId: user.id });
                          setShowBanModal(true);
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Ban user"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMessageData({ ...messageData, userId: user.id });
                        setShowMessageModal(true);
                      }}
                      className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      title="Send message"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteData({ ...deleteData, userId: user.id });
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Enhanced Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Ban className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Ban User</h3>
                    <p className="text-white/70 text-sm">Restrict user access to the platform</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBanModal(false)}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white/70 mb-2">User Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/50">Name:</span>
                      <span className="text-white ml-2">{users.find(u => u.id === banData.userId)?.name || users.find(u => u.id === banData.userId)?.username || 'Anonymous'}</span>
                    </div>
                    <div>
                      <span className="text-white/50">Email:</span>
                      <span className="text-white ml-2">{users.find(u => u.id === banData.userId)?.email}</span>
                    </div>
                    <div>
                      <span className="text-white/50">Status:</span>
                      <span className={`ml-2 ${users.find(u => u.id === banData.userId)?.onlineStatus === 'online' ? 'text-green-400' : 'text-white/70'}`}>
                        {users.find(u => u.id === banData.userId)?.onlineStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/50">Joined:</span>
                      <span className="text-white ml-2">
                        {users.find(u => u.id === banData.userId)?.createdAt ? 
                          new Date(users.find(u => u.id === banData.userId)!.createdAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ban Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Ban Reason *</label>
                    <textarea
                      value={banData.reason}
                      onChange={(e) => setBanData({ ...banData, reason: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 resize-none"
                      placeholder="Enter detailed reason for the ban..."
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-white/50">
                        {banData.reason.length} characters
                      </span>
                      {banData.reason.length < 10 && (
                        <span className="text-xs text-yellow-400">Reason seems too short</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Duration *</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={banData.days}
                        onChange={(e) => setBanData({ ...banData, days: parseInt(e.target.value) || 1 })}
                        className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      />
                      <span className="text-white/70">days</span>
                      <div className="text-sm text-white/50">
                        Expires: {new Date(Date.now() + banData.days * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Quick Duration Buttons */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Quick Duration</label>
                    <div className="flex gap-2">
                      {[
                        { label: '1 Day', days: 1 },
                        { label: '3 Days', days: 3 },
                        { label: '1 Week', days: 7 },
                        { label: '1 Month', days: 30 },
                        { label: '3 Months', days: 90 },
                        { label: 'Permanent', days: 365 }
                      ].map((option) => (
                        <button
                          key={option.days}
                          onClick={() => setBanData({ ...banData, days: option.days })}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            banData.days === option.days
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notification Options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white/70">Notification Options</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="sendEmail"
                        checked={banData.sendEmail}
                        onChange={(e) => setBanData({ ...banData, sendEmail: e.target.checked })}
                        className="w-4 h-4 text-red-400 bg-white/10 border-white/20 rounded focus:ring-red-400/50"
                      />
                      <label htmlFor="sendEmail" className="text-white/70">
                        Send email notification to user
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="notifyUser"
                        checked={banData.notifyUser}
                        onChange={(e) => setBanData({ ...banData, notifyUser: e.target.checked })}
                        className="w-4 h-4 text-orange-400 bg-white/10 border-white/20 rounded focus:ring-orange-400/50"
                      />
                      <label htmlFor="notifyUser" className="text-white/70">
                        Create in-app notification
                      </label>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Important</span>
                  </div>
                  <p className="text-sm text-white/70">
                    This action will immediately restrict the user's access to the platform. 
                    The ban will be logged and the user will be notified according to your settings above.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/50">
                  Ban will be effective immediately
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowBanModal(false)}
                    className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBanUser}
                    disabled={!banData.reason.trim() || banData.days < 1}
                    className="flex items-center gap-2 px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Ban className="h-4 w-4" />
                    Ban User
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Mail className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Send Message</h3>
                    <p className="text-white/70 text-sm">Send a message to the user</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white/70 mb-2">Recipient</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/50">Name:</span>
                      <span className="text-white ml-2">{users.find(u => u.id === messageData.userId)?.name || users.find(u => u.id === messageData.userId)?.username || 'Anonymous'}</span>
                    </div>
                    <div>
                      <span className="text-white/50">Email:</span>
                      <span className="text-white ml-2">{users.find(u => u.id === messageData.userId)?.email}</span>
                    </div>
                    <div>
                      <span className="text-white/50">Status:</span>
                      <span className={`ml-2 ${users.find(u => u.id === messageData.userId)?.onlineStatus === 'online' ? 'text-green-400' : 'text-white/70'}`}>
                        {users.find(u => u.id === messageData.userId)?.onlineStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/50">Last Seen:</span>
                      <span className="text-white ml-2">
                        {users.find(u => u.id === messageData.userId)?.lastSeen ? 
                          new Date(users.find(u => u.id === messageData.userId)!.lastSeen!).toLocaleString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Templates */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Quick Templates</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { subject: 'Welcome to GeeksTalk!', message: 'Welcome to our community! We\'re excited to have you here. Feel free to explore and connect with other members.' },
                      { subject: 'Account Verification', message: 'Please verify your account to access all features. Check your email for verification instructions.' },
                      { subject: 'Community Guidelines', message: 'Please review our community guidelines to ensure a positive experience for everyone.' },
                      { subject: 'Support Request', message: 'We\'ve received your support request and will get back to you within 24 hours.' }
                    ].map((template, index) => (
                      <button
                        key={index}
                        onClick={() => setMessageData({ 
                          ...messageData, 
                          subject: template.subject, 
                          message: template.message 
                        })}
                        className="p-3 text-left bg-white/5 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="text-sm font-medium text-white">{template.subject}</div>
                        <div className="text-xs text-white/50 mt-1 line-clamp-2">{template.message}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Subject *</label>
                    <input
                      type="text"
                      value={messageData.subject}
                      onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      placeholder="Enter message subject..."
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-white/50">
                        {messageData.subject.length} characters
                      </span>
                      {messageData.subject.length < 5 && (
                        <span className="text-xs text-yellow-400">Subject seems too short</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Message *</label>
                    <textarea
                      value={messageData.message}
                      onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                      rows={8}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 resize-none"
                      placeholder="Enter your message content..."
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-white/50">
                        {messageData.message.length} characters
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMessageData({ ...messageData, message: '' })}
                          className="text-xs text-white/50 hover:text-white transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Options */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-white/70">Message Options</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-2">Priority</label>
                      <select
                        value={messageData.priority}
                        onChange={(e) => setMessageData({ ...messageData, priority: e.target.value })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      >
                        <option value="low">Low Priority</option>
                        <option value="normal">Normal Priority</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="sendEmail"
                          checked={messageData.sendEmail}
                          onChange={(e) => setMessageData({ ...messageData, sendEmail: e.target.checked })}
                          className="w-4 h-4 text-blue-400 bg-white/10 border-white/20 rounded focus:ring-blue-400/50"
                        />
                        <label htmlFor="sendEmail" className="text-white/70">
                          Send via email
                        </label>
                      </div>
                    </div>
                  </div>

                  {messageData.sendEmail && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Email Preview</span>
                      </div>
                      <div className="text-xs text-white/70">
                        <p><strong>To:</strong> {users.find(u => u.id === messageData.userId)?.email}</p>
                        <p><strong>Subject:</strong> {messageData.subject || '[No subject]'}</p>
                        <p><strong>From:</strong> GeeksTalk Admin</p>
                        <p><strong>Priority:</strong> {messageData.priority}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Validation */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {messageData.subject.length < 5 && (
                      <span className="text-yellow-400">Subject seems too short</span>
                    )}
                    {messageData.message.length < 10 && (
                      <span className="text-yellow-400">Message seems too short</span>
                    )}
                    {messageData.message.length > 1000 && (
                      <span className="text-red-400">Message is quite long</span>
                    )}
                  </div>
                  <span className={`text-xs ${
                    messageData.subject.length > 0 && messageData.message.length > 0 ? 'text-green-400' : 'text-white/50'
                  }`}>
                    {messageData.subject.length > 0 && messageData.message.length > 0 ? 'Ready to send' : 'Complete the form'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/50">
                  Message will be saved to user's inbox
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMessageModal(false)}
                    className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageData.subject.trim() || !messageData.message.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Trash2 className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Delete User</h3>
                    <p className="text-white/70 text-sm">Permanently remove user and their data</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white/70 mb-2">User to be Deleted</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/50">Name:</span>
                      <span className="text-white ml-2">{users.find(u => u.id === deleteData.userId)?.name || users.find(u => u.id === deleteData.userId)?.username || 'Anonymous'}</span>
                    </div>
                    <div>
                      <span className="text-white/50">Email:</span>
                      <span className="text-white ml-2">{users.find(u => u.id === deleteData.userId)?.email}</span>
                    </div>
                    <div>
                      <span className="text-white/50">Joined:</span>
                      <span className="text-white ml-2">
                        {users.find(u => u.id === deleteData.userId)?.createdAt ? 
                          new Date(users.find(u => u.id === deleteData.userId)!.createdAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/50">Likes:</span>
                      <span className="text-white ml-2">{users.find(u => u.id === deleteData.userId)?.likesCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Data Deletion Options */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-white/70">Data Deletion Options</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="deleteMessages"
                        checked={deleteData.deleteMessages}
                        onChange={(e) => setDeleteData({ ...deleteData, deleteMessages: e.target.checked })}
                        className="w-4 h-4 text-red-400 bg-white/10 border-white/20 rounded focus:ring-red-400/50"
                      />
                      <label htmlFor="deleteMessages" className="text-white/70">
                        Delete all user messages and conversations
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="deleteFiles"
                        checked={deleteData.deleteFiles}
                        onChange={(e) => setDeleteData({ ...deleteData, deleteFiles: e.target.checked })}
                        className="w-4 h-4 text-red-400 bg-white/10 border-white/20 rounded focus:ring-red-400/50"
                      />
                      <label htmlFor="deleteFiles" className="text-white/70">
                        Delete all uploaded files and media
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="sendNotification"
                        checked={deleteData.sendNotification}
                        onChange={(e) => setDeleteData({ ...deleteData, sendNotification: e.target.checked })}
                        className="w-4 h-4 text-blue-400 bg-white/10 border-white/20 rounded focus:ring-blue-400/50"
                      />
                      <label htmlFor="sendNotification" className="text-white/70">
                        Send deletion notification email
                      </label>
                    </div>
                  </div>
                </div>

                {/* Confirmation */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-white/70">Confirmation Required</h4>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Type <span className="font-mono bg-red-500/20 text-red-400 px-2 py-1 rounded">DELETE</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteData.confirmText}
                      onChange={(e) => setDeleteData({ ...deleteData, confirmText: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      placeholder="Type DELETE to confirm..."
                    />
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Irreversible Action</span>
                  </div>
                  <p className="text-sm text-white/70">
                    This action cannot be undone. All user data will be permanently removed from the system. 
                    Make sure you have backed up any important information before proceeding.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/50">
                  This action is permanent and cannot be undone
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={deleteData.confirmText !== 'DELETE'}
                    className="flex items-center gap-2 px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete User
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <User className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">User Details</h3>
                    <p className="text-white/70 text-sm">Complete user information and activity</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserDetailsModal(false)}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/70 mb-3">Basic Information</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Name', value: selectedUser.name || selectedUser.username || 'Anonymous', copyable: true },
                        { label: 'Email', value: selectedUser.email, copyable: true },
                        { label: 'Username', value: selectedUser.username || 'Not set', copyable: true },
                        { label: 'User ID', value: selectedUser.id, copyable: true },
                        { label: 'Status', value: selectedUser.onlineStatus, copyable: false },
                        { label: 'Last Seen', value: selectedUser.lastSeen ? new Date(selectedUser.lastSeen).toLocaleString() : 'Unknown', copyable: false },
                        { label: 'Joined', value: new Date(selectedUser.createdAt).toLocaleString(), copyable: false },
                        { label: 'Likes Received', value: selectedUser.likesCount.toString(), copyable: false }
                      ].map((field) => (
                        <div key={field.label} className="flex items-center justify-between">
                          <span className="text-white/50 text-sm">{field.label}:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm">{field.value}</span>
                            {field.copyable && (
                              <button
                                onClick={() => copyToClipboard(field.value, field.label)}
                                className="p-1 text-white/50 hover:text-white transition-colors"
                                title="Copy to clipboard"
                              >
                                {copiedField === field.label ? (
                                  <Check className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/70 mb-3">Activity Statistics</h4>
                    <div className="space-y-3">
                      {selectedUser.activity ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-sm">Messages Sent:</span>
                            <span className="text-white text-sm">{selectedUser.activity.totalMessages}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-sm">Voice Chat Time:</span>
                            <span className="text-white text-sm">{selectedUser.activity.voiceMinutes} minutes</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-sm">Total Online Time:</span>
                            <span className="text-white text-sm">{selectedUser.activity.totalOnlineTime} minutes</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-white/50 text-sm">No activity data available</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ban History */}
                {selectedUser.bans && selectedUser.bans.length > 0 && (
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/70 mb-3">Ban History</h4>
                    <div className="space-y-3">
                      {selectedUser.bans.map((ban, index) => (
                        <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-red-400">Ban #{index + 1}</span>
                            <span className="text-xs text-white/50">
                              {new Date(ban.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-white/70 mb-1">
                            <strong>Reason:</strong> {ban.reason}
                          </div>
                          <div className="text-sm text-white/70">
                            <strong>Expires:</strong> {new Date(ban.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reports */}
                {selectedUser.reports && selectedUser.reports.length > 0 && (
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/70 mb-3">Reports Received</h4>
                    <div className="space-y-3">
                      {selectedUser.reports.map((report, index) => (
                        <div key={index} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-orange-400">Report #{index + 1}</span>
                            <span className="text-xs text-white/50">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-white/70">
                            <strong>Reason:</strong> {report.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kicks */}
                {selectedUser.kicks && selectedUser.kicks.length > 0 && (
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/70 mb-3">Kicks Received</h4>
                    <div className="space-y-3">
                      {selectedUser.kicks.map((kick, index) => (
                        <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-yellow-400">Kick #{index + 1}</span>
                            <span className="text-xs text-white/50">
                              {new Date(kick.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-white/70">
                            <strong>Reason:</strong> {kick.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/50">
                  User details • Click copy icons to copy values
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowUserDetailsModal(false)}
                    className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDetailsModal(false);
                      setMessageData({ ...messageData, userId: selectedUser.id });
                      setShowMessageModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
