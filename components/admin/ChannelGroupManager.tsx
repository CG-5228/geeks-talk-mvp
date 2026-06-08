'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Hash,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Lock,
  Globe,
  MessageSquare,
  X,
  Search,
  RefreshCw,
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List as ListIcon,
  Copy,
  MoreHorizontal,
  UserMinus,
  UserX,
  Download,
  Activity,
  Clock,
  Shuffle,
  Timer,
  Sparkles,
  ExternalLink,
  Keyboard,
} from 'lucide-react';
import BulkActionBar from '@/components/admin/BulkActionBar';
import { useAdminToast } from '@/components/admin/AdminToast';

type Visibility = 'public' | 'private';

interface ChannelOwner {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface Channel {
  id: string;
  name: string;
  slug: string;
  topic?: string | null;
  visibility: Visibility;
  category: string;
  archived?: boolean;
  ownerId?: string | null;
  inviteCode?: string | null;
  createdAt: string;
  _count: {
    messages: number;
    members: number;
  };
  owner?: ChannelOwner | null;
  members?: ChannelMember[];
}

interface ChannelMember {
  id: string;
  name: string;
  email?: string;
  image?: string | null;
  onlineStatus?: string;
  joinedAt?: string;
}

interface VoiceGroup {
  id: string;
  channelId: string;
  groupNumber: number;
  tags: string[];
  maxMembers: number;
  isTemp: boolean;
  isRandom: boolean;
  expiresAt?: string | null;
  createdAt: string;
  _count: { members: number };
  channel: { id: string; name: string; slug: string; visibility: string };
  members?: ChannelMember[];
}

type Tab = 'channels' | 'groups';
type ViewMode = 'grid' | 'list';
type ChannelSortKey = 'name' | 'messages' | 'members' | 'createdAt' | 'category';
type GroupSortKey = 'channel' | 'groupNumber' | 'members' | 'createdAt';
type SortDir = 'asc' | 'desc';
type VisibilityFilter = 'all' | 'public' | 'private';
type ArchivedFilter = 'all' | 'active' | 'archived';
type ActivityFilter = 'all' | 'empty' | 'quiet' | 'busy';

const CATEGORIES = ['General', 'Programming', 'Mathematics', 'Cybersecurity', 'Computer General', 'Private'] as const;

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function ChannelGroupManager({ className = '' }: { className?: string }) {
  const toast = useAdminToast();
  const router = useRouter();
  const routeParams = useParams<{ hash?: string }>();
  const searchParams = useSearchParams();
  const hash = typeof routeParams?.hash === 'string' ? routeParams.hash : '';

  const initialTab: Tab = searchParams?.get('tab') === 'groups' ? 'groups' : 'channels';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<VoiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // shared search
  const [search, setSearch] = useState(searchParams?.get('q') ?? '');

  // channel filters
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [channelSortKey, setChannelSortKey] = useState<ChannelSortKey>('createdAt');
  const [channelSortDir, setChannelSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // group filters
  const [groupFlagFilter, setGroupFlagFilter] = useState<'all' | 'temp' | 'random' | 'empty' | 'full'>('all');
  const [groupSortKey, setGroupSortKey] = useState<GroupSortKey>('createdAt');
  const [groupSortDir, setGroupSortDir] = useState<SortDir>('desc');

  // selection
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  // modals & drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Channel | VoiceGroup | null>(null);
  const [groupDrawer, setGroupDrawer] = useState<VoiceGroup | null>(null);
  const [drawerMembers, setDrawerMembers] = useState<ChannelMember[]>([]);
  const [drawerMembersLoading, setDrawerMembersLoading] = useState(false);

  // form
  const emptyForm = {
    name: '',
    topic: '',
    visibility: 'public' as Visibility,
    category: 'General',
    channelId: '',
    groupNumber: 1,
    tags: [] as string[],
    maxMembers: 8,
    isTemp: false,
    isRandom: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  // Sync tab + search to URL (shallow) so links are shareable and browser back/forward work
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (tab === 'groups') url.searchParams.set('tab', 'groups');
    else url.searchParams.delete('tab');
    if (search.trim()) url.searchParams.set('q', search.trim());
    else url.searchParams.delete('q');
    const next = `${url.pathname}${url.search}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState({}, '', next);
    }
  }, [tab, search]);

  // Keyboard shortcuts: /=focus search, n=new, r=refresh, g=toggle view, t=toggle tab, ?=help, Esc=clear/close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showCreateModal) { setShowCreateModal(false); return; }
        if (showEditModal) { setShowEditModal(null); return; }
        if (groupDrawer) { setGroupDrawer(null); return; }
        if (typing && target === searchRef.current) {
          (target as HTMLInputElement).blur();
          return;
        }
        if (search || selectedChannels.size) {
          if (search) setSearch('');
          if (selectedChannels.size) clearSelection();
        }
        return;
      }
      if (typing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === 'n') {
        e.preventDefault();
        setForm(emptyForm);
        setShowCreateModal(true);
      } else if (e.key === 'r') {
        e.preventDefault();
        refresh();
      } else if (e.key === 'g') {
        e.preventDefault();
        if (tab === 'channels') setViewMode((v) => (v === 'grid' ? 'list' : 'grid'));
      } else if (e.key === 't') {
        e.preventDefault();
        setTab((t) => (t === 'channels' ? 'groups' : 'channels'));
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, selectedChannels, showCreateModal, showEditModal, groupDrawer, showShortcuts]);

  async function fetchAll() {
    setLoading(true);
    try {
      await Promise.all([fetchChannels(), fetchGroups()]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchChannels() {
    try {
      const res = await fetch('/api/admin/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (e) {
      console.error('Failed to fetch channels', e);
    }
  }

  async function fetchGroups() {
    try {
      const res = await fetch('/api/admin/voice-groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (e) {
      console.error('Failed to fetch groups', e);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  /* ------------- derived data ------------- */

  const channelStats = useMemo(() => {
    const total = channels.length;
    const publicN = channels.filter((c) => c.visibility === 'public').length;
    const privateN = channels.filter((c) => c.visibility === 'private').length;
    const archived = channels.filter((c) => c.archived).length;
    const msgs = channels.reduce((a, c) => a + (c._count?.messages || 0), 0);
    return { total, publicN, privateN, archived, msgs };
  }, [channels]);

  const groupStats = useMemo(() => {
    const total = groups.length;
    const active = groups.filter((g) => g._count.members > 0).length;
    const temp = groups.filter((g) => g.isTemp).length;
    const random = groups.filter((g) => g.isRandom).length;
    const capacity = groups.reduce((a, g) => a + g.maxMembers, 0);
    const filled = groups.reduce((a, g) => a + g._count.members, 0);
    const fillPct = capacity ? Math.round((filled / capacity) * 100) : 0;
    return { total, active, temp, random, fillPct };
  }, [groups]);

  const visibleChannels = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = channels.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.slug} ${c.topic ?? ''} ${c.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (visibility !== 'all' && c.visibility !== visibility) return false;
      if (archivedFilter === 'active' && c.archived) return false;
      if (archivedFilter === 'archived' && !c.archived) return false;
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (activityFilter !== 'all') {
        const m = c._count.messages;
        if (activityFilter === 'empty' && m !== 0) return false;
        if (activityFilter === 'quiet' && (m === 0 || m > 50)) return false;
        if (activityFilter === 'busy' && m <= 50) return false;
      }
      return true;
    });
    const dir = channelSortDir === 'asc' ? 1 : -1;
    arr = [...arr].sort((a, b) => {
      switch (channelSortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'category':
          return a.category.localeCompare(b.category) * dir;
        case 'messages':
          return (a._count.messages - b._count.messages) * dir;
        case 'members':
          return (a._count.members - b._count.members) * dir;
        case 'createdAt':
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
    return arr;
  }, [channels, search, visibility, archivedFilter, categoryFilter, activityFilter, channelSortKey, channelSortDir]);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = groups.filter((g) => {
      if (q) {
        const hay = `${g.channel.name} ${g.channel.slug} ${g.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (groupFlagFilter === 'temp' && !g.isTemp) return false;
      if (groupFlagFilter === 'random' && !g.isRandom) return false;
      if (groupFlagFilter === 'empty' && g._count.members !== 0) return false;
      if (groupFlagFilter === 'full' && g._count.members < g.maxMembers) return false;
      return true;
    });
    const dir = groupSortDir === 'asc' ? 1 : -1;
    arr = [...arr].sort((a, b) => {
      switch (groupSortKey) {
        case 'channel':
          return a.channel.name.localeCompare(b.channel.name) * dir;
        case 'groupNumber':
          return (a.groupNumber - b.groupNumber) * dir;
        case 'members':
          return (a._count.members - b._count.members) * dir;
        case 'createdAt':
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
    return arr;
  }, [groups, search, groupFlagFilter, groupSortKey, groupSortDir]);

  /* ------------- selection helpers ------------- */

  function toggleSelect(id: string) {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAllVisible() {
    setSelectedChannels(new Set(visibleChannels.map((c) => c.id)));
  }
  function clearSelection() {
    setSelectedChannels(new Set());
  }

  /* ------------- actions ------------- */

  async function doChannelCreate() {
    if (!form.name.trim()) {
      toast.push({ tone: 'error', title: 'Name required', description: 'Channel name cannot be empty' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, topic: form.topic, visibility: form.visibility, category: form.category }),
      });
      if (res.ok) {
        toast.push({ tone: 'success', title: 'Channel created', description: `#${form.name} is live` });
        setShowCreateModal(false);
        setForm(emptyForm);
        await fetchChannels();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Create failed', description: err.error || 'Could not create channel' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function doGroupCreate() {
    if (!form.channelId || !form.groupNumber) {
      toast.push({ tone: 'error', title: 'Missing info', description: 'Channel and group number required' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/voice-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: form.channelId,
          groupNumber: form.groupNumber,
          tags: form.tags,
          maxMembers: form.maxMembers,
          isTemp: form.isTemp,
          isRandom: form.isRandom,
        }),
      });
      if (res.ok) {
        toast.push({ tone: 'success', title: 'Group created', description: `Group ${form.groupNumber} added` });
        setShowCreateModal(false);
        setForm(emptyForm);
        await fetchGroups();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Create failed', description: err.error || 'Could not create group' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function doChannelUpdate(channel: Channel) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/channels/${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, topic: form.topic, visibility: form.visibility, category: form.category }),
      });
      if (res.ok) {
        toast.push({ tone: 'success', title: 'Channel updated' });
        setShowEditModal(null);
        setForm(emptyForm);
        await fetchChannels();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Update failed', description: err.error || 'Could not update channel' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function doGroupUpdate(group: VoiceGroup) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/voice-groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: form.channelId,
          groupNumber: form.groupNumber,
          tags: form.tags,
          maxMembers: form.maxMembers,
          isTemp: form.isTemp,
          isRandom: form.isRandom,
        }),
      });
      if (res.ok) {
        toast.push({ tone: 'success', title: 'Group updated' });
        setShowEditModal(null);
        setForm(emptyForm);
        await fetchGroups();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.push({ tone: 'error', title: 'Update failed', description: err.error || 'Could not update group' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleArchive(channel: Channel) {
    const targetArchived = !channel.archived;
    const ok = await toast.confirm({
      title: targetArchived ? 'Archive channel?' : 'Unarchive channel?',
      description: targetArchived
        ? `#${channel.name} will be hidden from default listings. Messages are preserved and can be restored any time.`
        : `#${channel.name} will become visible again in default listings.`,
      confirmLabel: targetArchived ? 'Archive' : 'Unarchive',
      tone: targetArchived ? 'danger' : 'default',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/channels/${channel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: targetArchived }),
    });
    if (res.ok) {
      toast.push({ tone: 'success', title: targetArchived ? 'Archived' : 'Unarchived' });
      await fetchChannels();
    } else {
      toast.push({ tone: 'error', title: 'Failed', description: 'Could not change archive state' });
    }
  }

  async function deleteChannel(channel: Channel) {
    const ok = await toast.confirm({
      title: `Delete #${channel.name}?`,
      description: `This permanently deletes the channel and its ${channel._count.messages.toLocaleString()} messages. This cannot be undone.`,
      confirmLabel: 'Delete channel',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/channels/${channel.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.push({ tone: 'success', title: 'Channel deleted' });
      clearSelection();
      await fetchChannels();
    } else {
      toast.push({ tone: 'error', title: 'Delete failed' });
    }
  }

  async function deleteGroup(group: VoiceGroup) {
    const ok = await toast.confirm({
      title: `Delete Group ${group.groupNumber}?`,
      description: `All ${group._count.members} members will lose access immediately.`,
      confirmLabel: 'Delete group',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/voice-groups/${group.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.push({ tone: 'success', title: 'Group deleted' });
      setGroupDrawer(null);
      await fetchGroups();
    } else {
      toast.push({ tone: 'error', title: 'Delete failed' });
    }
  }

  async function kickAll(group: VoiceGroup) {
    if (group._count.members === 0) {
      toast.push({ tone: 'info', title: 'Nothing to do', description: 'Group has no members' });
      return;
    }
    const ok = await toast.confirm({
      title: `Remove all ${group._count.members} members?`,
      description: 'Members can rejoin unless the group is also deleted.',
      confirmLabel: 'Kick all',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/voice-groups/${group.id}/members/kick-all`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      toast.push({ tone: 'success', title: 'Members removed', description: `${data.removed} member${data.removed === 1 ? '' : 's'} kicked` });
      await fetchGroups();
      if (groupDrawer?.id === group.id) {
        setDrawerMembers([]);
        setGroupDrawer({ ...group, _count: { members: 0 } });
      }
    } else {
      toast.push({ tone: 'error', title: 'Failed' });
    }
  }

  async function kickMember(group: VoiceGroup, memberId: string, memberName: string) {
    const ok = await toast.confirm({
      title: `Remove ${memberName}?`,
      description: 'They lose access immediately but can rejoin later.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/voice-groups/${group.id}/members?memberId=${memberId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.push({ tone: 'success', title: 'Member removed' });
      setDrawerMembers((prev) => prev.filter((m) => m.id !== memberId));
      await fetchGroups();
    } else {
      toast.push({ tone: 'error', title: 'Failed' });
    }
  }

  async function bulkAction(action: 'archive' | 'unarchive' | 'delete') {
    const ids = Array.from(selectedChannels);
    if (!ids.length) return;
    const verb = action === 'delete' ? 'Delete' : action === 'archive' ? 'Archive' : 'Unarchive';
    const destructive = action === 'delete';
    const ok = await toast.confirm({
      title: `${verb} ${ids.length} channel${ids.length === 1 ? '' : 's'}?`,
      description: destructive
        ? 'This permanently deletes channels and all their messages. Cannot be undone.'
        : action === 'archive'
          ? 'Archived channels are hidden from default listings but keep all data.'
          : 'Selected channels become visible in default listings again.',
      confirmLabel: verb,
      tone: destructive || action === 'archive' ? 'danger' : 'default',
    });
    if (!ok) return;
    const res = await fetch('/api/admin/channels/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelIds: ids, action }),
    });
    if (res.ok) {
      const data = await res.json();
      const count = data.updated ?? data.deleted ?? 0;
      toast.push({
        tone: 'success',
        title: `${verb} complete`,
        description: `${count} channel${count === 1 ? '' : 's'} ${action === 'delete' ? 'deleted' : action === 'archive' ? 'archived' : 'unarchived'}`,
      });
      clearSelection();
      await fetchChannels();
    } else {
      toast.push({ tone: 'error', title: `${verb} failed` });
    }
  }

  function exportChannelsCsv() {
    const rows = visibleChannels;
    if (!rows.length) {
      toast.push({ tone: 'info', title: 'Nothing to export' });
      return;
    }
    const header = ['id', 'name', 'slug', 'category', 'visibility', 'archived', 'members', 'messages', 'invite_code', 'created_at'];
    const lines = [
      header.join(','),
      ...rows.map((c) =>
        [
          c.id,
          c.name,
          c.slug,
          c.category,
          c.visibility,
          c.archived ? 'true' : 'false',
          c._count.members,
          c._count.messages,
          c.inviteCode ?? '',
          c.createdAt,
        ]
          .map(csvEscape)
          .join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `channels-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.push({ tone: 'success', title: 'Exported', description: `${rows.length} channels` });
  }

  function copyInvite(channel: Channel) {
    if (!channel.inviteCode) {
      toast.push({ tone: 'warning', title: 'No invite code', description: 'This channel does not have an invite code' });
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/invite/${channel.inviteCode}`);
    toast.push({ tone: 'success', title: 'Invite copied' });
  }

  /* ------------- navigation & drawer ------------- */

  function openChannel(channel: Channel) {
    if (!hash) {
      toast.push({ tone: 'error', title: 'Missing admin hash', description: 'Could not resolve admin route.' });
      return;
    }
    router.push(`/admin/${hash}/channels-groups/${channel.id}`);
  }

  async function openGroupDrawer(group: VoiceGroup) {
    setGroupDrawer(group);
    setDrawerMembers([]);
    setDrawerMembersLoading(true);
    try {
      const res = await fetch(`/api/admin/voice-groups/${group.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setDrawerMembers(data.members || []);
      }
    } finally {
      setDrawerMembersLoading(false);
    }
  }

  /* ------------- UI ------------- */

  if (loading) {
    return (
      <div className={`rounded-xl border border-white/10 bg-[#15171d] p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 bg-white/10 rounded" />
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-lg" />
            ))}
          </div>
          <div className="h-12 bg-white/5 rounded" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Channel & Group Management</h2>
          <p className="text-sm text-white/60">
            {tab === 'channels'
              ? `${channels.length} total · ${channelStats.publicN} public · ${channelStats.archived} archived`
              : `${groups.length} total · ${groupStats.active} active · ${groupStats.fillPct}% filled`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconBtn title="Keyboard shortcuts (?)" onClick={() => setShowShortcuts(true)}>
            <Keyboard className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Refresh (r)" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </IconBtn>
          <button
            onClick={() => {
              setForm(emptyForm);
              setShowCreateModal(true);
            }}
            title="New (n)"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00d9ff]/15 border border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/25 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New {tab === 'channels' ? 'Channel' : 'Group'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {tab === 'channels' ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Hash} label="Channels" value={channelStats.total} />
          <StatCard icon={Globe} label="Public" value={channelStats.publicN} tone="success" />
          <StatCard icon={Lock} label="Private" value={channelStats.privateN} tone="warning" />
          <StatCard icon={Archive} label="Archived" value={channelStats.archived} tone="neutral" />
          <StatCard icon={MessageSquare} label="Messages" value={channelStats.msgs.toLocaleString()} tone="primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Users} label="Groups" value={groupStats.total} />
          <StatCard icon={Activity} label="Active" value={groupStats.active} tone="success" />
          <StatCard icon={Timer} label="Temporary" value={groupStats.temp} tone="warning" />
          <StatCard icon={Shuffle} label="Random" value={groupStats.random} tone="primary" />
          <StatCard icon={Sparkles} label="Fill rate" value={`${groupStats.fillPct}%`} tone="neutral" />
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex items-center rounded-xl bg-white/5 border border-white/10 p-1">
        <TabBtn active={tab === 'channels'} onClick={() => setTab('channels')} icon={Hash}>
          Channels <span className="text-white/50 ml-1 tabular-nums">({channels.length})</span>
        </TabBtn>
        <TabBtn active={tab === 'groups'} onClick={() => setTab('groups')} icon={Users}>
          Voice Groups <span className="text-white/50 ml-1 tabular-nums">({groups.length})</span>
        </TabBtn>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-white/10 bg-[#15171d] p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'channels' ? 'Search name, slug, topic, category…  (press / to focus)' : 'Search channel or tags…  (press / to focus)'}
              className="w-full pl-10 pr-16 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/5">/</kbd>
          </div>
          {tab === 'channels' ? (
            <>
              <Select
                value={visibility}
                onChange={(v) => setVisibility(v as VisibilityFilter)}
                options={[
                  { value: 'all', label: 'All visibility' },
                  { value: 'public', label: 'Public' },
                  { value: 'private', label: 'Private' },
                ]}
              />
              <Select
                value={archivedFilter}
                onChange={(v) => setArchivedFilter(v as ArchivedFilter)}
                options={[
                  { value: 'all', label: 'All states' },
                  { value: 'active', label: 'Active only' },
                  { value: 'archived', label: 'Archived only' },
                ]}
              />
              <Select
                value={categoryFilter}
                onChange={(v) => setCategoryFilter(v)}
                options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
              />
              <Select
                value={activityFilter}
                onChange={(v) => setActivityFilter(v as ActivityFilter)}
                options={[
                  { value: 'all', label: 'Any activity' },
                  { value: 'empty', label: '0 messages' },
                  { value: 'quiet', label: '1–50 messages' },
                  { value: 'busy', label: '50+ messages' },
                ]}
              />
              <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
                <ViewToggle active={viewMode === 'grid'} onClick={() => setViewMode('grid')} icon={LayoutGrid} label="Grid" />
                <ViewToggle active={viewMode === 'list'} onClick={() => setViewMode('list')} icon={ListIcon} label="List" />
              </div>
              <button
                onClick={exportChannelsCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 text-sm"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </>
          ) : (
            <>
              <Select
                value={groupFlagFilter}
                onChange={(v) => setGroupFlagFilter(v as any)}
                options={[
                  { value: 'all', label: 'All groups' },
                  { value: 'temp', label: 'Temporary' },
                  { value: 'random', label: 'Random matching' },
                  { value: 'empty', label: 'Empty (0 members)' },
                  { value: 'full', label: 'Full' },
                ]}
              />
            </>
          )}
        </div>

        {/* Active filter summary */}
        {tab === 'channels' && (
          <ActiveFilterSummary
            total={channels.length}
            visible={visibleChannels.length}
            active={visibility !== 'all' || archivedFilter !== 'all' || categoryFilter !== 'all' || activityFilter !== 'all' || search.length > 0}
            onClear={() => {
              setSearch('');
              setVisibility('all');
              setArchivedFilter('all');
              setCategoryFilter('all');
              setActivityFilter('all');
            }}
          />
        )}
        {tab === 'groups' && (
          <ActiveFilterSummary
            total={groups.length}
            visible={visibleGroups.length}
            active={groupFlagFilter !== 'all' || search.length > 0}
            onClear={() => {
              setSearch('');
              setGroupFlagFilter('all');
            }}
          />
        )}
      </div>

      {/* Bulk bar */}
      {tab === 'channels' && (
        <BulkActionBar
          count={selectedChannels.size}
          onClear={clearSelection}
          label={selectedChannels.size === 1 ? 'channel selected' : 'channels selected'}
          actions={[
            { label: 'Archive', icon: Archive, tone: 'neutral', onClick: () => bulkAction('archive') },
            { label: 'Unarchive', icon: ArchiveRestore, tone: 'neutral', onClick: () => bulkAction('unarchive') },
            { label: 'Delete', icon: Trash2, tone: 'error', onClick: () => bulkAction('delete') },
          ]}
        />
      )}

      {/* Content */}
      {tab === 'channels' ? (
        viewMode === 'grid' ? (
          <ChannelGrid
            items={visibleChannels}
            selected={selectedChannels}
            onToggleSelect={toggleSelect}
            onOpen={openChannel}
            onEdit={(c) => {
              setForm({ ...emptyForm, name: c.name, topic: c.topic ?? '', visibility: c.visibility, category: c.category });
              setShowEditModal(c);
            }}
            onArchive={toggleArchive}
            onDelete={deleteChannel}
            onCopyInvite={copyInvite}
          />
        ) : (
          <ChannelList
            items={visibleChannels}
            sortKey={channelSortKey}
            sortDir={channelSortDir}
            onSort={(k) => {
              if (channelSortKey === k) setChannelSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
              else {
                setChannelSortKey(k);
                setChannelSortDir(k === 'name' || k === 'category' ? 'asc' : 'desc');
              }
            }}
            selected={selectedChannels}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAllVisible}
            onClearAll={clearSelection}
            onOpen={openChannel}
            onEdit={(c) => {
              setForm({ ...emptyForm, name: c.name, topic: c.topic ?? '', visibility: c.visibility, category: c.category });
              setShowEditModal(c);
            }}
            onArchive={toggleArchive}
            onDelete={deleteChannel}
          />
        )
      ) : (
        <GroupsList
          items={visibleGroups}
          sortKey={groupSortKey}
          sortDir={groupSortDir}
          onSort={(k) => {
            if (groupSortKey === k) setGroupSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
            else {
              setGroupSortKey(k);
              setGroupSortDir(k === 'channel' ? 'asc' : 'desc');
            }
          }}
          onOpen={openGroupDrawer}
          onEdit={(g) => {
            setForm({
              ...emptyForm,
              channelId: g.channelId,
              groupNumber: g.groupNumber,
              tags: g.tags,
              maxMembers: g.maxMembers,
              isTemp: g.isTemp,
              isRandom: g.isRandom,
            });
            setShowEditModal(g);
          }}
          onKickAll={kickAll}
          onDelete={deleteGroup}
        />
      )}

      {/* Group drawer */}
      {groupDrawer && (
        <GroupDrawer
          group={groupDrawer}
          members={drawerMembers}
          membersLoading={drawerMembersLoading}
          onClose={() => setGroupDrawer(null)}
          onKickMember={(mid, mname) => kickMember(groupDrawer, mid, mname)}
          onKickAll={() => kickAll(groupDrawer)}
          onDelete={() => deleteGroup(groupDrawer)}
          onEdit={(g) => {
            setForm({
              ...emptyForm,
              channelId: g.channelId,
              groupNumber: g.groupNumber,
              tags: g.tags,
              maxMembers: g.maxMembers,
              isTemp: g.isTemp,
              isRandom: g.isRandom,
            });
            setShowEditModal(g);
          }}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <FormModal
          title={`Create ${tab === 'channels' ? 'Channel' : 'Voice Group'}`}
          submitLabel={`Create ${tab === 'channels' ? 'channel' : 'group'}`}
          submitting={submitting}
          onClose={() => {
            setShowCreateModal(false);
            setForm(emptyForm);
          }}
          onSubmit={tab === 'channels' ? doChannelCreate : doGroupCreate}
        >
          {tab === 'channels' ? (
            <ChannelFormFields form={form} setForm={setForm} />
          ) : (
            <GroupFormFields form={form} setForm={setForm} channels={channels} />
          )}
        </FormModal>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <FormModal
          title={`Edit ${'name' in showEditModal ? 'Channel' : 'Voice Group'}`}
          submitLabel="Save changes"
          submitting={submitting}
          onClose={() => {
            setShowEditModal(null);
            setForm(emptyForm);
          }}
          onSubmit={() =>
            'name' in showEditModal
              ? doChannelUpdate(showEditModal as Channel)
              : doGroupUpdate(showEditModal as VoiceGroup)
          }
        >
          {'name' in showEditModal ? (
            <ChannelFormFields form={form} setForm={setForm} />
          ) : (
            <GroupFormFields form={form} setForm={setForm} channels={channels} />
          )}
        </FormModal>
      )}

      {/* Shortcuts dialog */}
      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

/* ===================== Subcomponents ===================== */

function IconBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function ViewToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`p-1.5 rounded-md transition-colors ${active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#15171d]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ActiveFilterSummary({
  total,
  visible,
  active,
  onClear,
}: {
  total: number;
  visible: number;
  active: boolean;
  onClear: () => void;
}) {
  if (!active) return null;
  return (
    <div className="flex items-center justify-between text-xs text-white/60 pt-1">
      <span>
        Showing <span className="text-white tabular-nums">{visible}</span> of <span className="tabular-nums">{total}</span>
      </span>
      <button onClick={onClear} className="text-[#00d9ff] hover:underline">
        Clear all filters
      </button>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'neutral';
}) {
  const toneMap: Record<string, string> = {
    default: 'text-white/80 bg-white/10',
    primary: 'text-[#00d9ff] bg-[#00d9ff]/10',
    success: 'text-green-400 bg-green-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    neutral: 'text-white/70 bg-white/5',
  };
  return (
    <div className="rounded-xl border border-white/10 bg-[#15171d] p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
        <div className="text-xl font-semibold text-white tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${
        active ? 'text-[#00d9ff]' : 'text-white/50 hover:text-white'
      } ${align === 'right' ? 'justify-end w-full' : ''}`}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
}

/* ---------- Channel grid ---------- */

function ChannelCard({
  c,
  selected,
  onToggleSelect,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
  onCopyInvite,
}: {
  c: Channel;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (c: Channel) => void;
  onEdit: (c: Channel) => void;
  onArchive: (c: Channel) => void;
  onDelete: (c: Channel) => void;
  onCopyInvite: (c: Channel) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors ${
        selected ? 'border-[#00d9ff]/60 bg-[#00d9ff]/5' : 'border-white/10 bg-[#15171d] hover:border-white/20'
      } ${c.archived ? 'opacity-75' : ''}`}
    >
      <div className="absolute top-3 left-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(c.id)}
          aria-label={`Select ${c.name}`}
          className="h-4 w-4 rounded border-white/30 bg-white/10 accent-[#00d9ff]"
        />
      </div>
      <div className="absolute top-3 right-3">
        <div className="relative">
          <button
            type="button"
            aria-label="More"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-white/10 bg-[#1a1b23] shadow-xl py-1">
                <MenuItem icon={ExternalLink} label="Open detail" onClick={() => { setMenuOpen(false); onOpen(c); }} />
                <MenuItem icon={Edit} label="Edit" onClick={() => { setMenuOpen(false); onEdit(c); }} />
                <MenuItem icon={Copy} label="Copy invite" onClick={() => { setMenuOpen(false); onCopyInvite(c); }} />
                <MenuItem
                  icon={c.archived ? ArchiveRestore : Archive}
                  label={c.archived ? 'Unarchive' : 'Archive'}
                  onClick={() => { setMenuOpen(false); onArchive(c); }}
                />
                <div className="h-px bg-white/10 my-1" />
                <MenuItem icon={Trash2} label="Delete" tone="error" onClick={() => { setMenuOpen(false); onDelete(c); }} />
              </div>
            </>
          )}
        </div>
      </div>

      <button type="button" onClick={() => onOpen(c)} className="w-full text-left mt-4">
        <div className="flex items-center gap-2 mb-2">
          {c.visibility === 'private' ? (
            <Lock className="h-4 w-4 text-amber-400" />
          ) : (
            <Globe className="h-4 w-4 text-green-400" />
          )}
          <span className="text-white font-medium truncate">#{c.name}</span>
          {c.archived && (
            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70">
              Archived
            </span>
          )}
        </div>
        <div className="text-xs text-white/50 font-mono truncate">/{c.slug}</div>
        {c.topic && <p className="text-sm text-white/70 mt-2 line-clamp-2">{c.topic}</p>}
        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-white/40">Members</div>
            <div className="text-white tabular-nums font-medium">{c._count.members}</div>
          </div>
          <div>
            <div className="text-white/40">Messages</div>
            <div className="text-white tabular-nums font-medium">{c._count.messages.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-white/40">Created</div>
            <div className="text-white font-medium">{formatDate(c.createdAt)}</div>
          </div>
        </div>
        <div className="mt-2">
          <span className="inline-block text-[10px] uppercase tracking-wider text-white/60 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
            {c.category}
          </span>
        </div>
      </button>
    </div>
  );
}

function ChannelGrid({
  items,
  selected,
  onToggleSelect,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
  onCopyInvite,
}: {
  items: Channel[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (c: Channel) => void;
  onEdit: (c: Channel) => void;
  onArchive: (c: Channel) => void;
  onDelete: (c: Channel) => void;
  onCopyInvite: (c: Channel) => void;
}) {
  if (!items.length) return <EmptyState icon={Hash} title="No channels match" description="Adjust filters or create a new channel." />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((c) => (
        <ChannelCard
          key={c.id}
          c={c}
          selected={selected.has(c.id)}
          onToggleSelect={onToggleSelect}
          onOpen={onOpen}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          onCopyInvite={onCopyInvite}
        />
      ))}
    </div>
  );
}

/* ---------- Channel list (table) ---------- */

function ChannelList({
  items,
  sortKey,
  sortDir,
  onSort,
  selected,
  onToggleSelect,
  onSelectAll,
  onClearAll,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
}: {
  items: Channel[];
  sortKey: ChannelSortKey;
  sortDir: SortDir;
  onSort: (k: ChannelSortKey) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onOpen: (c: Channel) => void;
  onEdit: (c: Channel) => void;
  onArchive: (c: Channel) => void;
  onDelete: (c: Channel) => void;
}) {
  if (!items.length) return <EmptyState icon={Hash} title="No channels match" description="Adjust filters or create a new channel." />;
  const allSelected = items.every((c) => selected.has(c.id)) && items.length > 0;
  return (
    <div className="rounded-xl border border-white/10 bg-[#15171d] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-3 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => (allSelected ? onClearAll() : onSelectAll())}
                  aria-label="Select all"
                  className="h-4 w-4 rounded border-white/30 bg-white/10 accent-[#00d9ff]"
                />
              </th>
              <th className="px-3 py-2.5 text-left">
                <SortHeader label="Channel" active={sortKey === 'name'} dir={sortDir} onClick={() => onSort('name')} />
              </th>
              <th className="px-3 py-2.5 text-left">
                <SortHeader label="Category" active={sortKey === 'category'} dir={sortDir} onClick={() => onSort('category')} />
              </th>
              <th className="px-3 py-2.5 text-right">
                <SortHeader label="Members" active={sortKey === 'members'} dir={sortDir} onClick={() => onSort('members')} align="right" />
              </th>
              <th className="px-3 py-2.5 text-right">
                <SortHeader label="Messages" active={sortKey === 'messages'} dir={sortDir} onClick={() => onSort('messages')} align="right" />
              </th>
              <th className="px-3 py-2.5 text-left">
                <SortHeader label="Created" active={sortKey === 'createdAt'} dir={sortDir} onClick={() => onSort('createdAt')} />
              </th>
              <th className="px-3 py-2.5 text-right w-32 text-xs font-medium uppercase tracking-wider text-white/50">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr
                key={c.id}
                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${selected.has(c.id) ? 'bg-[#00d9ff]/5' : ''} ${c.archived ? 'opacity-70' : ''}`}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => onToggleSelect(c.id)}
                    aria-label={`Select ${c.name}`}
                    className="h-4 w-4 rounded border-white/30 bg-white/10 accent-[#00d9ff]"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => onOpen(c)} className="text-left group">
                    <div className="flex items-center gap-2">
                      {c.visibility === 'private' ? (
                        <Lock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                      )}
                      <span className="text-white font-medium group-hover:underline">#{c.name}</span>
                      {c.archived && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/50 font-mono mt-0.5">/{c.slug}</div>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs text-white/70">{c.category}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-white tabular-nums">{c._count.members}</td>
                <td className="px-3 py-2.5 text-right text-white tabular-nums">{c._count.messages.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <RowBtn title="Open detail" onClick={() => onOpen(c)} icon={ExternalLink} />
                    <RowBtn title="Edit" onClick={() => onEdit(c)} icon={Edit} />
                    <RowBtn
                      title={c.archived ? 'Unarchive' : 'Archive'}
                      onClick={() => onArchive(c)}
                      icon={c.archived ? ArchiveRestore : Archive}
                    />
                    <RowBtn title="Delete" onClick={() => onDelete(c)} icon={Trash2} tone="error" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowBtn({
  icon: Icon,
  onClick,
  title,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  title: string;
  tone?: 'default' | 'error';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md transition-colors ${
        tone === 'error' ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'error';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-white/10 ${
        tone === 'error' ? 'text-red-400 hover:bg-red-500/10' : 'text-white/80 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#15171d] py-16 px-6 text-center">
      <Icon className="h-12 w-12 text-white/20 mx-auto mb-3" />
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-white/60">{description}</p>
    </div>
  );
}

/* ---------- Groups list ---------- */

function GroupsList({
  items,
  sortKey,
  sortDir,
  onSort,
  onOpen,
  onEdit,
  onKickAll,
  onDelete,
}: {
  items: VoiceGroup[];
  sortKey: GroupSortKey;
  sortDir: SortDir;
  onSort: (k: GroupSortKey) => void;
  onOpen: (g: VoiceGroup) => void;
  onEdit: (g: VoiceGroup) => void;
  onKickAll: (g: VoiceGroup) => void;
  onDelete: (g: VoiceGroup) => void;
}) {
  if (!items.length) return <EmptyState icon={Users} title="No voice groups" description="Adjust filters or create a new group." />;
  return (
    <div className="rounded-xl border border-white/10 bg-[#15171d] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-4 text-xs font-medium uppercase tracking-wider">
        <div className="flex-1">
          <SortHeader label="Group" active={sortKey === 'channel'} dir={sortDir} onClick={() => onSort('channel')} />
        </div>
        <div className="w-32">
          <SortHeader label="Fill" active={sortKey === 'members'} dir={sortDir} onClick={() => onSort('members')} />
        </div>
        <div className="w-32 hidden md:block">
          <SortHeader label="Created" active={sortKey === 'createdAt'} dir={sortDir} onClick={() => onSort('createdAt')} />
        </div>
        <div className="w-40 text-right text-white/50">Actions</div>
      </div>
      <ul>
        {items.map((g) => {
          const pct = g.maxMembers ? Math.min(100, Math.round((g._count.members / g.maxMembers) * 100)) : 0;
          return (
            <li key={g.id} className="px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <button type="button" onClick={() => onOpen(g)} className="text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users className="h-4 w-4 text-[#00d9ff] flex-shrink-0" />
                    <span className="text-white font-medium">#{g.channel.name}</span>
                    <span className="text-white/50">·</span>
                    <span className="text-white">Group {g.groupNumber}</span>
                    {g.isTemp && <FlagPill color="amber" icon={Timer} label="Temp" />}
                    {g.isRandom && <FlagPill color="purple" icon={Shuffle} label="Random" />}
                    {g.expiresAt && (
                      <span className="text-[10px] uppercase tracking-wider text-white/50">
                        Expires {relativeTime(g.expiresAt)}
                      </span>
                    )}
                  </div>
                  {g.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {g.tags.slice(0, 5).map((t, i) => (
                        <span key={i} className="text-[11px] bg-white/5 border border-white/10 text-white/70 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                      {g.tags.length > 5 && <span className="text-[11px] text-white/50">+{g.tags.length - 5}</span>}
                    </div>
                  )}
                </button>
              </div>
              <div className="w-32">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white tabular-nums font-medium">
                    {g._count.members}/{g.maxMembers}
                  </span>
                  <span className="text-white/50 tabular-nums">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pct >= 100 ? 'bg-red-400' : pct >= 75 ? 'bg-amber-400' : pct > 0 ? 'bg-[#00d9ff]' : 'bg-white/20'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="w-32 hidden md:block text-sm text-white/70 whitespace-nowrap">{formatDate(g.createdAt)}</div>
              <div className="w-40 flex items-center justify-end gap-1">
                <RowBtn title="View" onClick={() => onOpen(g)} icon={Eye} />
                <RowBtn title="Edit" onClick={() => onEdit(g)} icon={Edit} />
                <RowBtn title="Kick all" onClick={() => onKickAll(g)} icon={UserX} />
                <RowBtn title="Delete" onClick={() => onDelete(g)} icon={Trash2} tone="error" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FlagPill({
  color,
  icon: Icon,
  label,
}: {
  color: 'amber' | 'purple';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const map = {
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[color]}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

/* ---------- Drawers ---------- */

function DrawerShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl h-full bg-[#15171d] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-white truncate">{title}</div>
            {subtitle && <div className="text-xs text-white/60 mt-0.5">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10 text-white/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">{children}</div>
        {footer && <div className="p-4 border-t border-white/10 bg-[#12141a]">{footer}</div>}
      </div>
    </div>
  );
}

function DrawerStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-xs uppercase tracking-wider text-white/50 mb-1">{label}</div>
      <div className="text-white font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function GroupDrawer({
  group,
  members,
  membersLoading,
  onClose,
  onKickMember,
  onKickAll,
  onDelete,
  onEdit,
}: {
  group: VoiceGroup;
  members: ChannelMember[];
  membersLoading: boolean;
  onClose: () => void;
  onKickMember: (id: string, name: string) => void;
  onKickAll: () => void;
  onDelete: () => void;
  onEdit: (g: VoiceGroup) => void;
}) {
  const pct = group.maxMembers ? Math.min(100, Math.round((group._count.members / group.maxMembers) * 100)) : 0;
  return (
    <DrawerShell
      title={
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#00d9ff]" />
          {group.channel.name} · Group {group.groupNumber}
          {group.isTemp && <FlagPill color="amber" icon={Timer} label="Temp" />}
          {group.isRandom && <FlagPill color="purple" icon={Shuffle} label="Random" />}
        </span>
      }
      subtitle={`Channel /${group.channel.slug} · created ${relativeTime(group.createdAt)}`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(group)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 text-sm"
            >
              <Edit className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={onKickAll}
              disabled={group._count.members === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm disabled:opacity-40"
            >
              <UserX className="h-4 w-4" /> Kick all
            </button>
          </div>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm"
          >
            <Trash2 className="h-4 w-4" /> Delete group
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <DrawerStat label="Members" value={`${group._count.members}/${group.maxMembers}`} />
        <DrawerStat label="Fill" value={`${pct}%`} />
        <DrawerStat label="Created" value={formatDate(group.createdAt)} />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-white/50 mb-1.5">Capacity</div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full ${pct >= 100 ? 'bg-red-400' : pct >= 75 ? 'bg-amber-400' : pct > 0 ? 'bg-[#00d9ff]' : 'bg-white/20'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {group.tags.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-white/50 mb-1.5">Tags</div>
          <div className="flex items-center gap-1 flex-wrap">
            {group.tags.map((t, i) => (
              <span key={i} className="text-xs bg-white/5 border border-white/10 text-white/70 px-2 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      {group.expiresAt && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-amber-200">Expires {relativeTime(group.expiresAt)}</span>
        </div>
      )}
      <div>
        <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Members ({members.length})</div>
        {membersLoading ? (
          <div className="text-sm text-white/60">Loading…</div>
        ) : members.length === 0 ? (
          <div className="text-sm text-white/50 py-4 text-center">No members</div>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5 group">
                <div className="w-7 h-7 rounded-full bg-[#00d9ff]/15 text-[#00d9ff] flex items-center justify-center text-[10px] font-semibold">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{m.name}</div>
                  {m.email && <div className="text-xs text-white/50 truncate">{m.email}</div>}
                </div>
                {m.onlineStatus === 'online' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Online
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onKickMember(m.id, m.name)}
                  title="Remove member"
                  className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  <UserMinus className="h-3 w-3" /> Kick
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DrawerShell>
  );
}

/* ---------- Modals ---------- */

function FormModal({
  title,
  submitLabel,
  submitting,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  submitLabel: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#15171d] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white font-semibold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10 text-white/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/70 hover:text-white">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 hover:bg-[#00d9ff]/30 text-sm font-medium disabled:opacity-60"
          >
            {submitting && <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-[#00d9ff]" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type FormState = {
  name: string;
  topic: string;
  visibility: Visibility;
  category: string;
  channelId: string;
  groupNumber: number;
  tags: string[];
  maxMembers: number;
  isTemp: boolean;
  isRandom: boolean;
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
      {children} {required && <span className="text-red-400">*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 ${props.className ?? ''}`}
    />
  );
}

function ChannelFormFields({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  return (
    <>
      <div>
        <FieldLabel required>Channel name</FieldLabel>
        <Input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. announcements"
        />
      </div>
      <div>
        <FieldLabel>Topic</FieldLabel>
        <textarea
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          rows={3}
          placeholder="Describe what this channel is for…"
          className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Category</FieldLabel>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#15171d]">
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Visibility</FieldLabel>
          <select
            value={form.visibility}
            onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
          >
            <option value="public" className="bg-[#15171d]">Public</option>
            <option value="private" className="bg-[#15171d]">Private</option>
          </select>
        </div>
      </div>
    </>
  );
}

function GroupFormFields({
  form,
  setForm,
  channels,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  channels: Channel[];
}) {
  return (
    <>
      <div>
        <FieldLabel required>Channel</FieldLabel>
        <select
          value={form.channelId}
          onChange={(e) => setForm({ ...form, channelId: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
        >
          <option value="" className="bg-[#15171d]">
            Select a channel…
          </option>
          {channels.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#15171d]">
              #{c.name} ({c.visibility})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>Group number</FieldLabel>
          <Input
            type="number"
            min={1}
            max={99}
            value={form.groupNumber}
            onChange={(e) => setForm({ ...form, groupNumber: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div>
          <FieldLabel>Max members</FieldLabel>
          <Input
            type="number"
            min={2}
            max={50}
            value={form.maxMembers}
            onChange={(e) => setForm({ ...form, maxMembers: parseInt(e.target.value) || 8 })}
          />
        </div>
      </div>
      <div>
        <FieldLabel>Tags (comma-separated)</FieldLabel>
        <Input
          type="text"
          value={form.tags.join(', ')}
          onChange={(e) =>
            setForm({
              ...form,
              tags: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          placeholder="gaming, study, casual…"
        />
      </div>
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={form.isTemp}
            onChange={(e) => setForm({ ...form, isTemp: e.target.checked })}
            className="h-4 w-4 rounded accent-[#00d9ff]"
          />
          Temporary (24h)
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={form.isRandom}
            onChange={(e) => setForm({ ...form, isRandom: e.target.checked })}
            className="h-4 w-4 rounded accent-[#00d9ff]"
          />
          Random matching
        </label>
      </div>
    </>
  );
}

/* ---------- Shortcuts dialog ---------- */

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const items: { keys: string[]; label: string }[] = [
    { keys: ['/'], label: 'Focus search' },
    { keys: ['n'], label: 'New channel / group' },
    { keys: ['r'], label: 'Refresh list' },
    { keys: ['g'], label: 'Toggle grid / list view' },
    { keys: ['t'], label: 'Switch channels / voice groups' },
    { keys: ['?'], label: 'Toggle this dialog' },
    { keys: ['Esc'], label: 'Close dialog / clear search / clear selection' },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#15171d] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <Keyboard className="h-4 w-4 text-[#00d9ff]" />
            <h3 className="text-sm font-semibold">Keyboard shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="p-5 space-y-2">
          {items.map((it) => (
            <li key={it.label} className="flex items-center justify-between gap-4">
              <span className="text-sm text-white/80">{it.label}</span>
              <span className="flex items-center gap-1">
                {it.keys.map((k) => (
                  <kbd
                    key={k}
                    className="text-[11px] font-mono text-white px-1.5 py-0.5 rounded border border-white/15 bg-white/5"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="px-5 pb-4 text-[11px] text-white/50">
          Shortcuts don't fire while typing in text fields.
        </div>
      </div>
    </div>
  );
}
