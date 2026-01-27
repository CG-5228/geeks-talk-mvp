'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  User,
  Mail,
  Calendar,
  AlertTriangle,
  Check,
  X,
  Search
} from 'lucide-react';

interface AdminPermission {
  id: string;
  adminHash: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
  grantedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

interface AdminManagerProps {
  className?: string;
}

export default function AdminManager({ className = '' }: AdminManagerProps) {
  const [admins, setAdmins] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addData, setAddData] = useState({ email: '' });
  const [adding, setAdding] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Enhanced UI states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [emailSuggestions, setEmailSuggestions] = useState<Array<{id: string, email: string, name: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAdmins();
    checkSuperAdmin();
  }, []);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/permissions');
      const data = await response.json();

      // The API returns the admins array directly, not wrapped in an object
      setAdmins(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      setAdmins([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const checkSuperAdmin = async () => {
    try {
      const response = await fetch('/api/admin/check');
      const data = await response.json();
      setIsSuperAdmin(data.isSuperAdmin);
    } catch (error) {
      console.error('Failed to check super admin status:', error);
    }
  };

  const handleAddAdmin = async () => {
    if (!addData.email.trim()) return;

    setAdding(true);
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addData.email })
      });

      if (response.ok) {
        setShowAddModal(false);
        setAddData({ email: '' });
        setEmailSuggestions([]);
        setShowSuggestions(false);
        fetchAdmins();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add admin');
      }
    } catch (error) {
      console.error('Failed to add admin:', error);
      alert('Failed to add admin');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove admin access for ${userEmail}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        setShowDeleteConfirm(null);
        fetchAdmins();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove admin');
      }
    } catch (error) {
      console.error('Failed to remove admin:', error);
      alert('Failed to remove admin');
    }
  };

  const searchUsers = async (email: string) => {
    if (email.length < 2) {
      setEmailSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setEmailSuggestions(data.users || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      setEmailSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleEmailChange = (email: string) => {
    setAddData({ email });

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(email);
    }, 300);
  };

  const selectEmail = (user: {id: string, email: string, name: string}) => {
    setAddData({ email: user.email });
    setShowSuggestions(false);
    setEmailSuggestions([]);
  };

  if (!isSuperAdmin) {
    return (
      <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
          <p className="text-white/70">Only super admins can manage admin permissions.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Admin Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Admin
        </button>
      </div>

      <div className="space-y-4">
        {admins && admins.length > 0 ? admins.map((admin) => (
          <div key={admin.id} className="p-4 bg-white/5 border border-white/20 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="h-5 w-5 text-[#00d9ff]" />
                  <div>
                    <h3 className="font-medium text-white">{admin.user.name}</h3>
                    <p className="text-sm text-white/70">{admin.user.email}</p>
                    {admin.user.username && (
                      <p className="text-sm text-white/50">@{admin.user.username}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-white/70">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Added: {new Date(admin.createdAt).toLocaleDateString()}</span>
                  </div>
                  {admin.grantedByUser && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>By: {admin.grantedByUser.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-white/50">
                    <Shield className="h-3 w-3" />
                    <span>Session-based access (temporary hash)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showDeleteConfirm === admin.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRemoveAdmin(admin.user.id, admin.user.email)}
                      className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="Confirm delete"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="p-2 text-gray-400 hover:bg-gray-500/20 rounded-lg transition-colors"
                      title="Cancel delete"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(admin.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Remove admin access"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )) : null}
      </div>

      {(!admins || admins.length === 0) && (
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-white/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No admins found</h3>
          <p className="text-white/70">Add admin users to grant them access to the admin dashboard.</p>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Add Admin User</h3>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm text-white/70 mb-2">User Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={addData.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onFocus={() => setShowSuggestions(emailSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    placeholder="Enter user email address..."
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d9ff]"></div>
                    </div>
                  )}
                </div>

                {/* Email Suggestions Dropdown */}
                {showSuggestions && emailSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1b23] border border-white/20 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {emailSuggestions.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => selectEmail(user)}
                        className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#00d9ff]/20 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-[#00d9ff]" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{user.name || 'Unknown User'}</div>
                            <div className="text-white/70 text-sm">{user.email}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">Important</span>
                </div>
                <p className="text-yellow-400/80 text-sm mt-1">
                  The user must have an existing account. A unique admin hash will be generated for them.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAdmin}
                disabled={adding || !addData.email.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {adding ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d9ff]"></div>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
