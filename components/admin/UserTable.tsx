'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Ban,
  Mail,
  Trash2,
  UserCheck,
  UserX,
  Clock,
  MessageSquare,
  Mic,
  Activity,
  X,
  AlertTriangle,
  Send,
  Shield,
  User as UserIcon,
  Eye,
  Copy,
  Check,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users as UsersIcon,
  UserPlus,
  CircleDot,
  Filter as FilterIcon,
  SlidersHorizontal,
  MoreHorizontal,
} from 'lucide-react';
import BulkActionBar from '@/components/admin/BulkActionBar';
import { useAdminToast } from '@/components/admin/AdminToast';

type OnlineStatus = 'online' | 'offline';

interface UserActivity {
  totalMessages: number;
  voiceMinutes: number;
  totalOnlineTime: number;
}

interface UserBan {
  id: string;
  reason: string;
  expiresAt: string;
  createdAt?: string;
  bannedBy?: string;
}

interface UserReport {
  id: string;
  reason: string;
  createdAt: string;
  reportedBy?: string;
}

interface UserKick {
  id: string;
  reason: string;
  createdAt: string;
  kickedBy?: string;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  createdAt: string;
  onlineStatus: OnlineStatus;
  lastSeen?: string;
  activity?: UserActivity;
  likesCount: number;
  bans?: UserBan[];
  reports?: UserReport[];
  kicks?: UserKick[];
}

type SortKey = 'name' | 'joined' | 'last_seen' | 'messages' | 'likes' | 'status';
type SortDir = 'asc' | 'desc';

type BannedFilter = 'any' | 'banned' | 'clean';
type StatusFilter = 'any' | 'online' | 'offline';
type JoinedFilter = 'any' | '24h' | '7d' | '30d' | '90d';
type ActivityFilter = 'any' | 'messages' | 'voice';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function UserTable({ className = '' }: { className?: string }) {
  const toast = useAdminToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & sort
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('any');
  const [bannedFilter, setBannedFilter] = useState<BannedFilter>('any');
  const [joinedFilter, setJoinedFilter] = useState<JoinedFilter>('any');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('any');
  const [sortKey, setSortKey] = useState<SortKey>('joined');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Modals
  const [showBanModal, setShowBanModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkBanModal, setShowBulkBanModal] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [drawerUser, setDrawerUser] = useState<AdminUser | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [openRowMenu, setOpenRowMenu] = useState<{ id: string; top: number; right: number } | null>(null);

  const [banData, setBanData] = useState({ userId: '', reason: '', days: 1, sendEmail: true, notifyUser: true });
  const [messageData, setMessageData] = useState({ userId: '', subject: '', message: '', sendEmail: true, priority: 'normal' });
  const [deleteData, setDeleteData] = useState({ userId: '', confirmText: '', deleteMessages: false, deleteFiles: false, sendNotification: true });
  const [bulkBanForm, setBulkBanForm] = useState({ reason: '', days: 7 });
  const [bulkMessageForm, setBulkMessageForm] = useState({ subject: '', message: '', priority: 'normal' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (e) {
      console.error('Failed to fetch users', e);
      toast.push({ tone: 'error', title: 'Failed to load users', description: 'Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  // --- Derived stats
  const stats = useMemo(() => {
    const now = Date.now();
    let online = 0;
    let banned = 0;
    let new7d = 0;
    let messages24h = 0;
    for (const u of users) {
      if (u.onlineStatus === 'online') online++;
      if (u.bans && u.bans.length > 0) banned++;
      if (now - new Date(u.createdAt).getTime() < 7 * DAY_MS) new7d++;
      messages24h += u.activity?.totalMessages ?? 0;
    }
    return { total: users.length, online, banned, new7d, messages24h };
  }, [users]);

  // --- Filtering
  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const now = Date.now();
    return users.filter((u) => {
      if (q) {
        const hit =
          (u.name ?? '').toLowerCase().includes(q) ||
          (u.username ?? '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (statusFilter !== 'any' && u.onlineStatus !== statusFilter) return false;
      if (bannedFilter === 'banned' && !(u.bans && u.bans.length > 0)) return false;
      if (bannedFilter === 'clean' && u.bans && u.bans.length > 0) return false;
      if (joinedFilter !== 'any') {
        const ageMs = now - new Date(u.createdAt).getTime();
        const windowMs =
          joinedFilter === '24h' ? DAY_MS : joinedFilter === '7d' ? 7 * DAY_MS : joinedFilter === '30d' ? 30 * DAY_MS : 90 * DAY_MS;
        if (ageMs > windowMs) return false;
      }
      if (activityFilter === 'messages' && (u.activity?.totalMessages ?? 0) === 0) return false;
      if (activityFilter === 'voice' && (u.activity?.voiceMinutes ?? 0) === 0) return false;
      return true;
    });
  }, [users, searchTerm, statusFilter, bannedFilter, joinedFilter, activityFilter]);

  // --- Sorting
  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      switch (sortKey) {
        case 'name':
          av = (a.name ?? a.username ?? a.email).toLowerCase();
          bv = (b.name ?? b.username ?? b.email).toLowerCase();
          break;
        case 'joined':
          av = new Date(a.createdAt).getTime();
          bv = new Date(b.createdAt).getTime();
          break;
        case 'last_seen':
          av = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          bv = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          break;
        case 'messages':
          av = a.activity?.totalMessages ?? 0;
          bv = b.activity?.totalMessages ?? 0;
          break;
        case 'likes':
          av = a.likesCount;
          bv = b.likesCount;
          break;
        case 'status':
          av = a.onlineStatus === 'online' ? 1 : 0;
          bv = b.onlineStatus === 'online' ? 1 : 0;
          break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filteredUsers, sortKey, sortDir]);

  const onHeaderClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  // --- Selection
  const toggleSelected = (id: string) =>
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const clearSelection = () => setSelectedUsers(new Set());
  const toggleAllFiltered = () => {
    setSelectedUsers((prev) => {
      if (sortedUsers.every((u) => prev.has(u.id))) {
        const next = new Set(prev);
        sortedUsers.forEach((u) => next.delete(u.id));
        return next;
      }
      const next = new Set(prev);
      sortedUsers.forEach((u) => next.add(u.id));
      return next;
    });
  };

  // --- Actions (single)
  const handleBanUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${banData.userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: banData.reason, duration: banData.days, sendEmail: banData.sendEmail, notifyUser: banData.notifyUser }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Ban failed', description: err.error || 'Unknown error' });
        return;
      }
      toast.push({ tone: 'success', title: 'User banned', description: `Ban active for ${banData.days} day${banData.days === 1 ? '' : 's'}.` });
      setShowBanModal(false);
      setBanData({ userId: '', reason: '', days: 1, sendEmail: true, notifyUser: true });
      fetchUsers();
    } catch (e) {
      toast.push({ tone: 'error', title: 'Ban failed', description: 'Network error' });
    }
  };

  const handleSendMessage = async () => {
    try {
      const res = await fetch(`/api/admin/users/${messageData.userId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Message failed', description: err.error || 'Unknown error' });
        return;
      }
      toast.push({ tone: 'success', title: 'Message sent' });
      setShowMessageModal(false);
      setMessageData({ userId: '', subject: '', message: '', sendEmail: true, priority: 'normal' });
    } catch (e) {
      toast.push({ tone: 'error', title: 'Message failed', description: 'Network error' });
    }
  };

  const handleDeleteUser = async () => {
    if (deleteData.confirmText !== 'DELETE') {
      toast.push({ tone: 'warning', title: 'Type DELETE to confirm' });
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: deleteData.userId,
          deleteMessages: deleteData.deleteMessages,
          deleteFiles: deleteData.deleteFiles,
          sendNotification: deleteData.sendNotification,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Delete failed', description: err.error || 'Unknown error' });
        return;
      }
      toast.push({ tone: 'success', title: 'User deleted' });
      setShowDeleteModal(false);
      setDeleteData({ userId: '', confirmText: '', deleteMessages: false, deleteFiles: false, sendNotification: true });
      fetchUsers();
    } catch (e) {
      toast.push({ tone: 'error', title: 'Delete failed', description: 'Network error' });
    }
  };

  const handleQuickUnban = async (userId: string) => {
    const ok = await toast.confirm({
      title: 'Unban this user?',
      description: 'Their active ban will expire immediately.',
      confirmLabel: 'Unban',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Unban failed', description: err.error || 'Unknown error' });
        return;
      }
      toast.push({ tone: 'success', title: 'User unbanned' });
      fetchUsers();
    } catch {
      toast.push({ tone: 'error', title: 'Unban failed', description: 'Network error' });
    }
  };

  // --- Bulk actions
  const bulkIds = () => Array.from(selectedUsers);

  const bulkUnban = async () => {
    if (selectedUsers.size === 0) return;
    const ok = await toast.confirm({
      title: `Unban ${selectedUsers.size} user${selectedUsers.size === 1 ? '' : 's'}?`,
      description: 'Any active bans will expire immediately.',
      confirmLabel: 'Unban all',
    });
    if (!ok) return;
    setBulkBusy(true);
    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: bulkIds(), action: 'unban' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Bulk unban failed', description: err.error || 'Unknown error' });
        return;
      }
      const data = await res.json();
      clearSelection();
      fetchUsers();
      toast.push({ tone: 'success', title: `Expired ${data.updated} active ban${data.updated === 1 ? '' : 's'}` });
    } finally {
      setBulkBusy(false);
    }
  };

  const submitBulkBan = async () => {
    if (!bulkBanForm.reason.trim() || bulkBanForm.reason.length < 3) {
      toast.push({ tone: 'warning', title: 'Reason too short', description: 'Provide at least 3 characters.' });
      return;
    }
    setBulkBusy(true);
    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: bulkIds(),
          action: 'ban',
          reason: bulkBanForm.reason,
          duration: bulkBanForm.days,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Bulk ban failed', description: err.error || 'Unknown error' });
        return;
      }
      const data = await res.json();
      toast.push({
        tone: 'success',
        title: `${data.banned} users banned`,
        description: data.skippedSuperAdmins ? `Skipped ${data.skippedSuperAdmins} super admin(s).` : undefined,
      });
      setShowBulkBanModal(false);
      setBulkBanForm({ reason: '', days: 7 });
      clearSelection();
      fetchUsers();
    } finally {
      setBulkBusy(false);
    }
  };

  const submitBulkMessage = async () => {
    if (!bulkMessageForm.subject.trim() || !bulkMessageForm.message.trim()) {
      toast.push({ tone: 'warning', title: 'Subject and body are required' });
      return;
    }
    setBulkBusy(true);
    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: bulkIds(),
          action: 'message',
          subject: bulkMessageForm.subject,
          message: bulkMessageForm.message,
          priority: bulkMessageForm.priority,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Bulk message failed', description: err.error || 'Unknown error' });
        return;
      }
      const data = await res.json();
      toast.push({ tone: 'success', title: `Sent to ${data.delivered} users` });
      setShowBulkMessageModal(false);
      setBulkMessageForm({ subject: '', message: '', priority: 'normal' });
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExportCsv = () => {
    const ids = bulkIds();
    const url = ids.length > 0 ? `/api/admin/users/export?ids=${encodeURIComponent(ids.join(','))}` : '/api/admin/users/export';
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.push({ tone: 'info', title: 'Export started', description: ids.length > 0 ? `Exporting ${ids.length} selected users.` : 'Exporting all users.' });
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast.push({ tone: 'error', title: 'Copy failed' });
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const rowPad = density === 'comfortable' ? 'py-3.5' : 'py-2';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ------------ Stats strip ------------ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard icon={UsersIcon} label="Total users" value={stats.total.toLocaleString()} tone="default" />
        <StatCard icon={CircleDot} label="Online now" value={stats.online.toLocaleString()} tone="success" subtle={`${stats.total ? Math.round((stats.online / stats.total) * 100) : 0}% of base`} />
        <StatCard icon={UserPlus} label="New · 7d" value={stats.new7d.toLocaleString()} tone="primary" />
        <StatCard icon={Ban} label="Banned" value={stats.banned.toLocaleString()} tone={stats.banned > 0 ? 'warning' : 'default'} />
        <StatCard icon={MessageSquare} label="Messages total" value={stats.messages24h.toLocaleString()} tone="default" subtle="across all users" />
      </div>

      {/* ------------ Toolbar ------------ */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, username, ID…"
              className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <FilterChip
            icon={CircleDot}
            label="Status"
            value={statusFilter === 'any' ? 'Any' : statusFilter === 'online' ? 'Online' : 'Offline'}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
            ]}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            active={statusFilter !== 'any'}
          />
          <FilterChip
            icon={Ban}
            label="Ban"
            value={bannedFilter === 'any' ? 'Any' : bannedFilter === 'banned' ? 'Banned' : 'Clean'}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'banned', label: 'Active ban' },
              { value: 'clean', label: 'No bans' },
            ]}
            onChange={(v) => setBannedFilter(v as BannedFilter)}
            active={bannedFilter !== 'any'}
          />
          <FilterChip
            icon={Clock}
            label="Joined"
            value={joinedFilter === 'any' ? 'Any time' : joinedFilter === '24h' ? '24h' : joinedFilter === '7d' ? '7 days' : joinedFilter === '30d' ? '30 days' : '90 days'}
            options={[
              { value: 'any', label: 'Any time' },
              { value: '24h', label: 'Last 24h' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
            ]}
            onChange={(v) => setJoinedFilter(v as JoinedFilter)}
            active={joinedFilter !== 'any'}
          />
          <FilterChip
            icon={Activity}
            label="Activity"
            value={activityFilter === 'any' ? 'Any' : activityFilter === 'messages' ? 'Has messages' : 'Voice activity'}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'messages', label: 'Sent messages' },
              { value: 'voice', label: 'Used voice' },
            ]}
            onChange={(v) => setActivityFilter(v as ActivityFilter)}
            active={activityFilter !== 'any'}
          />

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              title="Toggle row density"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {density === 'comfortable' ? 'Compact' : 'Comfortable'}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {(statusFilter !== 'any' || bannedFilter !== 'any' || joinedFilter !== 'any' || activityFilter !== 'any' || searchTerm) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
            <FilterIcon className="h-3 w-3" />
            <span>
              Showing <span className="font-medium text-white">{sortedUsers.length.toLocaleString()}</span> of {users.length.toLocaleString()} users
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('any');
                setBannedFilter('any');
                setJoinedFilter('any');
                setActivityFilter('any');
              }}
              className="text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ------------ Bulk Action Bar ------------ */}
      <BulkActionBar
        count={selectedUsers.size}
        onClear={clearSelection}
        label={selectedUsers.size === 1 ? 'user selected' : 'users selected'}
        actions={[
          { label: 'Ban…', icon: Ban, tone: 'error', onClick: () => setShowBulkBanModal(true), disabled: bulkBusy },
          { label: 'Unban', icon: Shield, tone: 'success', onClick: bulkUnban, disabled: bulkBusy },
          { label: 'Message…', icon: Mail, tone: 'primary', onClick: () => setShowBulkMessageModal(true), disabled: bulkBusy },
          { label: 'Export CSV', icon: Download, tone: 'neutral', onClick: handleExportCsv, disabled: bulkBusy },
        ]}
      />

      {/* ------------ Table ------------ */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all users"
                    checked={sortedUsers.length > 0 && sortedUsers.every((u) => selectedUsers.has(u.id))}
                    ref={(el) => {
                      if (el) {
                        const some = sortedUsers.some((u) => selectedUsers.has(u.id));
                        const all = sortedUsers.every((u) => selectedUsers.has(u.id));
                        el.indeterminate = some && !all;
                      }
                    }}
                    onChange={toggleAllFiltered}
                    className="h-4 w-4 rounded"
                  />
                </th>
                <SortHeader label="User" active={sortKey === 'name'} dir={sortDir} onClick={() => onHeaderClick('name')} />
                <SortHeader label="Status" active={sortKey === 'status'} dir={sortDir} onClick={() => onHeaderClick('status')} />
                <SortHeader label="Messages" align="right" active={sortKey === 'messages'} dir={sortDir} onClick={() => onHeaderClick('messages')} />
                <SortHeader label="Likes" align="right" active={sortKey === 'likes'} dir={sortDir} onClick={() => onHeaderClick('likes')} />
                <SortHeader label="Last seen" active={sortKey === 'last_seen'} dir={sortDir} onClick={() => onHeaderClick('last_seen')} />
                <SortHeader label="Joined" active={sortKey === 'joined'} dir={sortDir} onClick={() => onHeaderClick('joined')} />
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-white/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => {
                const bannedActive = !!(user.bans && user.bans.length > 0);
                return (
                  <tr
                    key={user.id}
                    className={`group border-b border-white/5 transition-colors ${
                      selectedUsers.has(user.id) ? 'bg-primary/10' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <td className={`px-4 ${rowPad}`}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${user.email}`}
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleSelected(user.id)}
                        className="h-4 w-4 rounded"
                      />
                    </td>
                    <td className={`px-4 ${rowPad}`}>
                      <button
                        type="button"
                        onClick={() => setDrawerUser(user)}
                        className="group/user flex min-w-0 items-center gap-3 text-left"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
                          {(user.name ?? user.username ?? user.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-white group-hover/user:text-primary">
                              {user.name ?? user.username ?? 'Anonymous'}
                            </span>
                            {bannedActive && (
                              <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-300 ring-1 ring-red-500/30">
                                Banned
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-white/50">{user.email}</div>
                        </div>
                      </button>
                    </td>
                    <td className={`px-4 ${rowPad}`}>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
                          user.onlineStatus === 'online' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/50'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${user.onlineStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`}
                          aria-hidden
                        />
                        {user.onlineStatus}
                      </span>
                    </td>
                    <td className={`px-4 text-right text-sm tabular-nums text-white/80 ${rowPad}`}>
                      {(user.activity?.totalMessages ?? 0).toLocaleString()}
                    </td>
                    <td className={`px-4 text-right text-sm tabular-nums text-white/80 ${rowPad}`}>
                      {user.likesCount.toLocaleString()}
                    </td>
                    <td className={`px-4 text-sm text-white/60 ${rowPad}`}>
                      {user.lastSeen ? relativeTime(new Date(user.lastSeen)) : '—'}
                    </td>
                    <td className={`px-4 text-sm text-white/60 ${rowPad}`}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className={`px-4 ${rowPad} text-right`}>
                      <div className="inline-flex items-center gap-1">
                        <IconButton title="View details" onClick={() => setDrawerUser(user)} tone="primary">
                          <Eye className="h-4 w-4" />
                        </IconButton>
                        {bannedActive ? (
                          <IconButton title="Unban user" onClick={() => handleQuickUnban(user.id)} tone="warning">
                            <Shield className="h-4 w-4" />
                          </IconButton>
                        ) : (
                          <IconButton
                            title="Ban user"
                            onClick={() => {
                              setBanData({ userId: user.id, reason: '', days: 1, sendEmail: true, notifyUser: true });
                              setShowBanModal(true);
                            }}
                            tone="danger"
                          >
                            <Ban className="h-4 w-4" />
                          </IconButton>
                        )}
                        <IconButton
                          title="Send message"
                          onClick={() => {
                            setMessageData({ userId: user.id, subject: '', message: '', sendEmail: true, priority: 'normal' });
                            setShowMessageModal(true);
                          }}
                          tone="info"
                        >
                          <Mail className="h-4 w-4" />
                        </IconButton>
                        <div>
                          <IconButton
                            title="More"
                            tone="neutral"
                            onClick={(e) => {
                              if (openRowMenu?.id === user.id) {
                                setOpenRowMenu(null);
                                return;
                              }
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setOpenRowMenu({
                                id: user.id,
                                top: rect.bottom + 4,
                                right: window.innerWidth - rect.right,
                              });
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </IconButton>
                          {openRowMenu?.id === user.id && (
                            <>
                              <div className="fixed inset-0 z-[60]" onClick={() => setOpenRowMenu(null)} />
                              <div
                                role="menu"
                                style={{ top: openRowMenu.top, right: openRowMenu.right }}
                                className="fixed z-[70] min-w-[160px] overflow-hidden rounded-lg border border-white/10 bg-[#16181d] py-1 shadow-xl"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    copyToClipboard(user.id, `row-id-${user.id}`);
                                    setOpenRowMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                                >
                                  <Copy className="h-3.5 w-3.5" /> Copy user ID
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    copyToClipboard(user.email, `row-email-${user.id}`);
                                    setOpenRowMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                                >
                                  <Copy className="h-3.5 w-3.5" /> Copy email
                                </button>
                                <div className="my-1 h-px bg-white/5" />
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setDeleteData({ userId: user.id, confirmText: '', deleteMessages: false, deleteFiles: false, sendNotification: true });
                                    setShowDeleteModal(true);
                                    setOpenRowMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete user
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="mx-auto max-w-sm">
                      <UsersIcon className="mx-auto mb-3 h-10 w-10 text-white/20" />
                      <div className="text-sm font-medium text-white">No users match your filters</div>
                      <p className="mt-1 text-xs text-white/50">Clear filters to see the full roster.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------ Drawer: user details ------------ */}
      {drawerUser && (
        <UserDetailDrawer
          user={drawerUser}
          onClose={() => setDrawerUser(null)}
          onCopy={copyToClipboard}
          copiedField={copiedField}
          onMessage={() => {
            setMessageData({ userId: drawerUser.id, subject: '', message: '', sendEmail: true, priority: 'normal' });
            setShowMessageModal(true);
            setDrawerUser(null);
          }}
          onBan={() => {
            setBanData({ userId: drawerUser.id, reason: '', days: 1, sendEmail: true, notifyUser: true });
            setShowBanModal(true);
            setDrawerUser(null);
          }}
          onUnban={() => {
            setDrawerUser(null);
            handleQuickUnban(drawerUser.id);
          }}
        />
      )}

      {/* ------------ Existing single-user modals ------------ */}
      {showBanModal && (
        <BanModal
          users={users}
          banData={banData}
          setBanData={setBanData}
          onClose={() => setShowBanModal(false)}
          onSubmit={handleBanUser}
        />
      )}
      {showMessageModal && (
        <MessageModal
          users={users}
          messageData={messageData}
          setMessageData={setMessageData}
          onClose={() => setShowMessageModal(false)}
          onSubmit={handleSendMessage}
        />
      )}
      {showDeleteModal && (
        <DeleteModal
          users={users}
          deleteData={deleteData}
          setDeleteData={setDeleteData}
          onClose={() => setShowDeleteModal(false)}
          onSubmit={handleDeleteUser}
        />
      )}

      {/* ------------ Bulk modals ------------ */}
      {showBulkBanModal && (
        <BulkBanModal
          count={selectedUsers.size}
          form={bulkBanForm}
          setForm={setBulkBanForm}
          busy={bulkBusy}
          onClose={() => setShowBulkBanModal(false)}
          onSubmit={submitBulkBan}
        />
      )}
      {showBulkMessageModal && (
        <BulkMessageModal
          count={selectedUsers.size}
          form={bulkMessageForm}
          setForm={setBulkMessageForm}
          busy={bulkBusy}
          onClose={() => setShowBulkMessageModal(false)}
          onSubmit={submitBulkMessage}
        />
      )}
    </div>
  );
}

// =================== Small building blocks ===================

function StatCard({
  icon: Icon,
  label,
  value,
  subtle,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtle?: string;
  tone: 'default' | 'primary' | 'success' | 'warning';
}) {
  const toneCls = {
    default: 'text-white/70 bg-white/5 ring-white/10',
    primary: 'text-primary bg-primary/10 ring-primary/20',
    success: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/20',
    warning: 'text-amber-300 bg-amber-500/10 ring-amber-500/20',
  }[tone];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-white/50">{label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</div>
          {subtle && <div className="mt-1 text-[11px] text-white/45">{subtle}</div>}
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${toneCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function FilterChip<T extends string>({
  icon: Icon,
  label,
  value,
  options,
  onChange,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
          active
            ? 'border-primary/40 bg-primary/15 text-primary'
            : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="text-white/50">{label}:</span>
        <span>{value}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute left-0 top-full z-40 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-white/10 bg-[#16181d] py-1 shadow-xl">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={value === opt.label}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-white/80 hover:bg-white/5"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SortHeader({
  label,
  align = 'left',
  active,
  dir,
  onClick,
}: {
  label: string;
  align?: 'left' | 'right';
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/60 ${align === 'right' ? 'text-right' : 'text-left'}`} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition hover:text-white ${align === 'right' ? 'flex-row-reverse' : ''} ${active ? 'text-white' : ''}`}
      >
        <span>{label}</span>
        <Icon className="h-3 w-3 opacity-70" />
      </button>
    </th>
  );
}

function IconButton({
  onClick,
  title,
  tone,
  children,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  tone: 'primary' | 'danger' | 'warning' | 'info' | 'neutral';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'primary'
      ? 'text-emerald-300 hover:bg-emerald-500/15'
      : tone === 'danger'
        ? 'text-red-300 hover:bg-red-500/15'
        : tone === 'warning'
          ? 'text-amber-300 hover:bg-amber-500/15'
          : tone === 'info'
            ? 'text-sky-300 hover:bg-sky-500/15'
            : 'text-white/60 hover:bg-white/10';
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} className={`rounded-md p-1.5 transition ${cls}`}>
      {children}
    </button>
  );
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return date.toLocaleDateString();
}

// =================== Drawer ===================

function UserDetailDrawer({
  user,
  onClose,
  onCopy,
  copiedField,
  onMessage,
  onBan,
  onUnban,
}: {
  user: AdminUser;
  onClose: () => void;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
  onMessage: () => void;
  onBan: () => void;
  onUnban: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const bannedActive = !!(user.bans && user.bans.length > 0);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="User details"
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#16181d] shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <header className="flex items-start justify-between border-b border-white/10 p-5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/30">
              {(user.name ?? user.username ?? user.email).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-white">{user.name ?? user.username ?? 'Anonymous'}</h2>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className="truncate">{user.email}</span>
                <button
                  type="button"
                  onClick={() => onCopy(user.email, 'drawer-email')}
                  className="text-white/40 hover:text-white"
                  aria-label="Copy email"
                >
                  {copiedField === 'drawer-email' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-white/60 hover:bg-white/5 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <DrawerStat label="Status" value={<span className={user.onlineStatus === 'online' ? 'text-emerald-300' : 'text-white/60'}>{user.onlineStatus}</span>} />
            <DrawerStat label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
            <DrawerStat label="Last seen" value={user.lastSeen ? relativeTime(new Date(user.lastSeen)) : '—'} />
            <DrawerStat label="Likes" value={user.likesCount.toLocaleString()} />
          </div>

          <section className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">Activity</div>
            {user.activity ? (
              <div className="space-y-2 text-sm">
                <ActivityRow icon={MessageSquare} label="Messages sent" value={user.activity.totalMessages.toLocaleString()} />
                <ActivityRow icon={Mic} label="Voice time" value={`${user.activity.voiceMinutes.toLocaleString()} min`} />
                <ActivityRow icon={Activity} label="Online time" value={`${user.activity.totalOnlineTime.toLocaleString()} min`} />
              </div>
            ) : (
              <p className="text-sm text-white/50">No activity recorded.</p>
            )}
          </section>

          <section className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">Identifiers</div>
            <div className="space-y-2 text-sm">
              <IdRow label="User ID" value={user.id} field="drawer-id" onCopy={onCopy} copiedField={copiedField} />
              <IdRow label="Username" value={user.username ?? '—'} field="drawer-username" onCopy={onCopy} copiedField={copiedField} />
            </div>
          </section>

          {bannedActive && (
            <section className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Active bans
              </div>
              <div className="space-y-2">
                {user.bans!.map((b) => (
                  <div key={b.id} className="rounded-lg border border-red-500/15 bg-red-500/5 p-3">
                    <div className="flex items-center justify-between text-xs text-red-200">
                      <span className="font-medium">Expires {new Date(b.expiresAt).toLocaleDateString()}</span>
                      {b.createdAt && <span className="text-red-300/60">Issued {new Date(b.createdAt).toLocaleDateString()}</span>}
                    </div>
                    <div className="mt-1 text-sm text-red-100">{b.reason}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {user.reports && user.reports.length > 0 && (
            <section className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-300">Reports received ({user.reports.length})</div>
              <div className="space-y-2">
                {user.reports.slice(0, 5).map((r) => (
                  <div key={r.id} className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3 text-sm text-amber-100">
                    <div className="text-xs text-amber-300/70">{new Date(r.createdAt).toLocaleDateString()}</div>
                    <div>{r.reason}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 bg-black/20 p-4">
          {bannedActive ? (
            <button
              type="button"
              onClick={onUnban}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20"
            >
              <Shield className="h-4 w-4" />
              Unban user
            </button>
          ) : (
            <button
              type="button"
              onClick={onBan}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20"
            >
              <Ban className="h-4 w-4" />
              Ban user
            </button>
          )}
          <button
            type="button"
            onClick={onMessage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25"
          >
            <Mail className="h-4 w-4" />
            Send message
          </button>
        </footer>
      </aside>
    </div>
  );
}

function DrawerStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">{label}</div>
      <div className="mt-1 text-sm text-white">{value}</div>
    </div>
  );
}

function ActivityRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-white/60">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="tabular-nums text-white">{value}</span>
    </div>
  );
}

function IdRow({
  label,
  value,
  field,
  onCopy,
  copiedField,
}: {
  label: string;
  value: string;
  field: string;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/50">{label}</span>
      <div className="flex items-center gap-2">
        <code className="truncate font-mono text-[11px] text-white/80">{value}</code>
        <button type="button" onClick={() => onCopy(value, field)} className="text-white/40 hover:text-white" aria-label={`Copy ${label}`}>
          {copiedField === field ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

// =================== Single-user modals ===================
// Shared shell to keep modal visuals consistent.

function ModalShell({ onClose, title, subtitle, icon: Icon, tone, children, footer, maxW = 'max-w-2xl' }: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'danger' | 'primary' | 'info' | 'warning';
  children: React.ReactNode;
  footer: React.ReactNode;
  maxW?: string;
}) {
  const toneCls = {
    danger: 'bg-red-500/15 text-red-300',
    primary: 'bg-primary/15 text-primary',
    info: 'bg-sky-500/15 text-sky-300',
    warning: 'bg-amber-500/15 text-amber-300',
  }[tone];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full ${maxW} overflow-hidden rounded-2xl border border-white/10 bg-[#16181d] shadow-2xl animate-in zoom-in-95 duration-150`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneCls}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-white/60">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-black/20 p-4">{footer}</div>
      </div>
    </div>
  );
}

function BanModal({ users, banData, setBanData, onClose, onSubmit }: {
  users: AdminUser[];
  banData: { userId: string; reason: string; days: number; sendEmail: boolean; notifyUser: boolean };
  setBanData: React.Dispatch<React.SetStateAction<{ userId: string; reason: string; days: number; sendEmail: boolean; notifyUser: boolean }>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const user = users.find((u) => u.id === banData.userId);
  return (
    <ModalShell onClose={onClose} title="Ban user" subtitle={user ? `${user.name ?? user.username ?? user.email}` : 'Restrict platform access'} icon={Ban} tone="danger" footer={
      <>
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/70 hover:text-white">Cancel</button>
        <button type="button" onClick={onSubmit} disabled={!banData.reason.trim() || banData.days < 1} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/25 disabled:opacity-50">
          <Ban className="h-4 w-4" /> Ban user
        </button>
      </>
    }>
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Reason *</label>
          <textarea value={banData.reason} onChange={(e) => setBanData({ ...banData, reason: e.target.value })} rows={3} placeholder="Detailed reason…" className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Duration *</label>
          <div className="flex items-center gap-3">
            <input type="number" min={1} max={365} value={banData.days} onChange={(e) => setBanData({ ...banData, days: Math.max(1, parseInt(e.target.value) || 1) })} className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/40" />
            <span className="text-sm text-white/60">days · expires {new Date(Date.now() + banData.days * 86_400_000).toLocaleDateString()}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { label: '1 day', days: 1 },
              { label: '3 days', days: 3 },
              { label: '1 week', days: 7 },
              { label: '1 month', days: 30 },
              { label: '3 months', days: 90 },
              { label: '1 year', days: 365 },
            ].map((opt) => (
              <button key={opt.days} type="button" onClick={() => setBanData({ ...banData, days: opt.days })} className={`rounded-full px-2.5 py-1 text-xs transition ${banData.days === opt.days ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">
          <AlertTriangle className="mb-1 inline-block h-3.5 w-3.5" /> This restricts platform access immediately and is logged to audit.
        </div>
      </div>
    </ModalShell>
  );
}

function MessageModal({ users, messageData, setMessageData, onClose, onSubmit }: {
  users: AdminUser[];
  messageData: { userId: string; subject: string; message: string; sendEmail: boolean; priority: string };
  setMessageData: React.Dispatch<React.SetStateAction<{ userId: string; subject: string; message: string; sendEmail: boolean; priority: string }>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const user = users.find((u) => u.id === messageData.userId);
  return (
    <ModalShell onClose={onClose} title="Send message" subtitle={user ? user.email : undefined} icon={Mail} tone="info" footer={
      <>
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/70 hover:text-white">Cancel</button>
        <button type="button" onClick={onSubmit} disabled={!messageData.subject.trim() || !messageData.message.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 disabled:opacity-50">
          <Send className="h-4 w-4" /> Send message
        </button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Subject *</label>
          <input value={messageData.subject} onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-primary/40" placeholder="Subject…" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Message *</label>
          <textarea value={messageData.message} onChange={(e) => setMessageData({ ...messageData, message: e.target.value })} rows={7} className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-primary/40" placeholder="Message body…" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Priority</label>
          <select value={messageData.priority} onChange={(e) => setMessageData({ ...messageData, priority: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/40">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteModal({ users, deleteData, setDeleteData, onClose, onSubmit }: {
  users: AdminUser[];
  deleteData: { userId: string; confirmText: string; deleteMessages: boolean; deleteFiles: boolean; sendNotification: boolean };
  setDeleteData: React.Dispatch<React.SetStateAction<{ userId: string; confirmText: string; deleteMessages: boolean; deleteFiles: boolean; sendNotification: boolean }>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const user = users.find((u) => u.id === deleteData.userId);
  return (
    <ModalShell onClose={onClose} title="Delete user" subtitle={user ? `Permanently remove ${user.email}` : undefined} icon={Trash2} tone="danger" footer={
      <>
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/70 hover:text-white">Cancel</button>
        <button type="button" onClick={onSubmit} disabled={deleteData.confirmText !== 'DELETE'} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/25 disabled:opacity-50">
          <Trash2 className="h-4 w-4" /> Delete forever
        </button>
      </>
    }>
      <div className="space-y-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">
          <AlertTriangle className="mb-1 inline-block h-3.5 w-3.5" /> This cannot be undone. Messages and related records will cascade-delete.
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2 text-white/70">
            <input type="checkbox" checked={deleteData.deleteMessages} onChange={(e) => setDeleteData({ ...deleteData, deleteMessages: e.target.checked })} className="h-4 w-4 rounded" />
            Also delete all messages/threads (redundant — cascade)
          </label>
          <label className="flex items-center gap-2 text-white/70">
            <input type="checkbox" checked={deleteData.deleteFiles} onChange={(e) => setDeleteData({ ...deleteData, deleteFiles: e.target.checked })} className="h-4 w-4 rounded" />
            Purge uploaded files
          </label>
          <label className="flex items-center gap-2 text-white/70">
            <input type="checkbox" checked={deleteData.sendNotification} onChange={(e) => setDeleteData({ ...deleteData, sendNotification: e.target.checked })} className="h-4 w-4 rounded" />
            Send final deletion email
          </label>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">
            Type <span className="font-mono rounded bg-red-500/20 px-1.5 py-0.5 text-red-300">DELETE</span> to confirm
          </label>
          <input value={deleteData.confirmText} onChange={(e) => setDeleteData({ ...deleteData, confirmText: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-500/40" placeholder="DELETE" />
        </div>
      </div>
    </ModalShell>
  );
}

function BulkBanModal({ count, form, setForm, busy, onClose, onSubmit }: {
  count: number;
  form: { reason: string; days: number };
  setForm: React.Dispatch<React.SetStateAction<{ reason: string; days: number }>>;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell onClose={onClose} title={`Ban ${count} user${count === 1 ? '' : 's'}`} subtitle="Applies a single reason + duration to all selected accounts" icon={Ban} tone="danger" footer={
      <>
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/70 hover:text-white">Cancel</button>
        <button type="button" disabled={busy || !form.reason.trim() || form.days < 1} onClick={onSubmit} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/25 disabled:opacity-50">
          <Ban className="h-4 w-4" /> Ban {count} user{count === 1 ? '' : 's'}
        </button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Reason *</label>
          <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-red-500/40" placeholder="Community violation: …" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Duration (days)</label>
          <input type="number" min={1} max={365} value={form.days} onChange={(e) => setForm({ ...form, days: Math.max(1, parseInt(e.target.value) || 1) })} className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[1, 3, 7, 30, 90, 365].map((d) => (
              <button key={d} type="button" onClick={() => setForm({ ...form, days: d })} className={`rounded-full px-2.5 py-1 text-xs transition ${form.days === d ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          Super admin accounts will be skipped automatically.
        </div>
      </div>
    </ModalShell>
  );
}

function BulkMessageModal({ count, form, setForm, busy, onClose, onSubmit }: {
  count: number;
  form: { subject: string; message: string; priority: string };
  setForm: React.Dispatch<React.SetStateAction<{ subject: string; message: string; priority: string }>>;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalShell onClose={onClose} title={`Message ${count} user${count === 1 ? '' : 's'}`} subtitle="Saves to inbox + in-app notification" icon={Mail} tone="primary" footer={
      <>
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/70 hover:text-white">Cancel</button>
        <button type="button" disabled={busy || !form.subject.trim() || !form.message.trim()} onClick={onSubmit} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25 disabled:opacity-50">
          <Send className="h-4 w-4" /> Send to {count} user{count === 1 ? '' : 's'}
        </button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Subject *</label>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/40" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Message *</label>
          <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={6} className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-white outline-none focus:border-primary/40" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/70">Priority</label>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/40">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
    </ModalShell>
  );
}
