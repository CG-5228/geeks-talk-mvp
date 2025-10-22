'use client';
import { useState, useEffect } from 'react';
import { 
  Hash, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Lock, 
  Globe,
  Calendar,
  MessageSquare,
  User,
  Check,
  X,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  slug: string;
  topic?: string;
  visibility: 'public' | 'private';
  category: string;
  ownerId?: string;
  inviteCode?: string;
  createdAt: string;
  _count: {
    messages: number;
  };
  members?: Array<{
    id: string;
    name: string;
    email: string;
    image?: string;
    onlineStatus: string;
  }>;
}

interface VoiceGroup {
  id: string;
  channelId: string;
  groupNumber: number;
  tags: string[];
  maxMembers: number;
  isTemp: boolean;
  isRandom: boolean;
  expiresAt?: string;
  createdAt: string;
  _count: {
    members: number;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
    visibility: string;
  };
  members?: Array<{
    id: string;
    name: string;
    email: string;
    image?: string;
    onlineStatus: string;
    joinedAt: string;
  }>;
}

interface ChannelGroupManagerProps {
  className?: string;
}

export default function ChannelGroupManager({ className = '' }: ChannelGroupManagerProps) {
  const [activeTab, setActiveTab] = useState<'channels' | 'groups'>('channels');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<VoiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'private'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Channel | VoiceGroup | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [kicking, setKicking] = useState(false);
  const [kickFeedback, setKickFeedback] = useState<string | null>(null);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    topic: '',
    visibility: 'public' as 'public' | 'private',
    category: 'General',
    // For groups
    channelId: '',
    groupNumber: 1,
    tags: [] as string[],
    maxMembers: 8,
    isTemp: false,
    isRandom: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchChannels(),
        fetchGroups()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/admin/channels');
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/voice-groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDelete = async (id: string, type: 'channel' | 'group') => {
    try {
      const endpoint = type === 'channel' ? `/api/admin/channels/${id}` : `/api/admin/voice-groups/${id}`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      
      if (response.ok) {
        setShowDeleteConfirm(null);
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || `Failed to delete ${type}`);
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
      alert(`Failed to delete ${type}`);
    }
  };

  const handleViewMembers = async (item: Channel | VoiceGroup) => {
    setSelectedItem(item);
    setShowMembersModal(true);
    
    // Fetch members for the selected item
    try {
      const endpoint = activeTab === 'channels' 
        ? `/api/admin/channels/${item.id}/members`
        : `/api/admin/voice-groups/${item.id}/members`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setSelectedItem({
          ...item,
          members: data.members || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const handleEdit = (item: Channel | VoiceGroup) => {
    setSelectedItem(item);
    setShowEditModal(true);
    
    // Populate form with existing data
    if (activeTab === 'channels') {
      const channel = item as Channel;
      setCreateForm({
        name: channel.name,
        topic: channel.topic || '',
        visibility: channel.visibility,
        category: channel.category,
        channelId: '',
        groupNumber: 1,
        tags: [],
        maxMembers: 8,
        isTemp: false,
        isRandom: false
      });
    } else {
      const group = item as VoiceGroup;
      setCreateForm({
        name: '',
        topic: '',
        visibility: 'public',
        category: 'General',
        channelId: group.channelId,
        groupNumber: group.groupNumber,
        tags: group.tags,
        maxMembers: group.maxMembers,
        isTemp: group.isTemp,
        isRandom: group.isRandom
      });
    }
  };

  const handleCreate = async () => {
    if (activeTab === 'channels') {
      if (!createForm.name.trim()) {
        alert('Channel name is required');
        return;
      }
    } else {
      if (!createForm.channelId || !createForm.groupNumber) {
        alert('Channel and group number are required');
        return;
      }
    }

    setCreating(true);
    try {
      const endpoint = activeTab === 'channels' ? '/api/admin/channels' : '/api/admin/voice-groups';
      const body = activeTab === 'channels' 
        ? {
            name: createForm.name,
            topic: createForm.topic,
            visibility: createForm.visibility,
            category: createForm.category
          }
        : {
            channelId: createForm.channelId,
            groupNumber: createForm.groupNumber,
            tags: createForm.tags,
            maxMembers: createForm.maxMembers,
            isTemp: createForm.isTemp,
            isRandom: createForm.isRandom
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || `Failed to create ${activeTab.slice(0, -1)}`);
      }
    } catch (error) {
      console.error(`Failed to create ${activeTab.slice(0, -1)}:`, error);
      alert(`Failed to create ${activeTab.slice(0, -1)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;

    setEditing(true);
    try {
      const endpoint = activeTab === 'channels' 
        ? `/api/admin/channels/${selectedItem.id}`
        : `/api/admin/voice-groups/${selectedItem.id}`;
      
      const body = activeTab === 'channels' 
        ? {
            name: createForm.name,
            topic: createForm.topic,
            visibility: createForm.visibility,
            category: createForm.category
          }
        : {
            channelId: createForm.channelId,
            groupNumber: createForm.groupNumber,
            tags: createForm.tags,
            maxMembers: createForm.maxMembers,
            isTemp: createForm.isTemp,
            isRandom: createForm.isRandom
          };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowEditModal(false);
        resetForm();
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || `Failed to update ${activeTab.slice(0, -1)}`);
      }
    } catch (error) {
      console.error(`Failed to update ${activeTab.slice(0, -1)}:`, error);
      alert(`Failed to update ${activeTab.slice(0, -1)}`);
    } finally {
      setEditing(false);
    }
  };

  const resetForm = () => {
    setCreateForm({
      name: '',
      topic: '',
      visibility: 'public',
      category: 'General',
      channelId: '',
      groupNumber: 1,
      tags: [],
      maxMembers: 8,
      isTemp: false,
      isRandom: false
    });
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         channel.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVisibility = filterVisibility === 'all' || channel.visibility === filterVisibility;
    return matchesSearch && matchesVisibility;
  });

  const filteredGroups = groups.filter(group => {
    return group.channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           group.channel.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
           group.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  if (loading) {
    return (
      <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Channel & Group Management</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create {activeTab === 'channels' ? 'Channel' : 'Group'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'channels'
              ? 'bg-white/10 text-white'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Hash className="h-4 w-4" />
          Channels ({channels.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'groups'
              ? 'bg-white/10 text-white'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="h-4 w-4" />
          Voice Groups ({groups.length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
          />
        </div>
        
        {activeTab === 'channels' && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/50" />
            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value as any)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
            >
              <option value="all">All Channels</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'channels' ? (
        <div className="space-y-4">
          {filteredChannels.map((channel) => (
            <div key={channel.id} className="p-4 bg-white/5 border border-white/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {channel.visibility === 'private' ? (
                      <Lock className="h-5 w-5 text-orange-400" />
                    ) : (
                      <Globe className="h-5 w-5 text-green-400" />
                    )}
                    <div>
                      <h3 className="font-medium text-white flex items-center gap-2">
                        #{channel.name}
                        <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/70">
                          {channel.category}
                        </span>
                      </h3>
                      <p className="text-sm text-white/70">{channel.slug}</p>
                      {channel.topic && (
                        <p className="text-sm text-white/60 mt-1">{channel.topic}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-white/70">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{channel._count.messages} messages</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created: {new Date(channel.createdAt).toLocaleDateString()}</span>
                    </div>
                    {channel.inviteCode && (
                      <div className="flex items-center gap-1">
                        <span>Invite: {channel.inviteCode}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewMembers(channel)}
                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="View members"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(channel)}
                    className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                    title="Edit channel"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {showDeleteConfirm === channel.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(channel.id, 'channel')}
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
                      onClick={() => setShowDeleteConfirm(channel.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete channel"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filteredChannels.length === 0 && (
            <div className="text-center py-12">
              <Hash className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No channels found</h3>
              <p className="text-white/70">
                {searchTerm ? 'Try adjusting your search terms.' : 'Create your first channel to get started.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.id} className="p-4 bg-white/5 border border-white/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-5 w-5 text-[#00d9ff]" />
                    <div>
                      <h3 className="font-medium text-white flex items-center gap-2">
                        {group.channel.name} - Group {group.groupNumber}
                        {group.isTemp && (
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                            Temporary
                          </span>
                        )}
                        {group.isRandom && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                            Random
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-white/70">
                        Channel: #{group.channel.slug} • {group.channel.visibility}
                      </p>
                      {group.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {group.tags.map((tag, index) => (
                            <span key={index} className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-white/70">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{group._count.members}/{group.maxMembers} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewMembers(group)}
                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="View members"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(group)}
                    className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                    title="Edit group"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {showDeleteConfirm === group.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(group.id, 'group')}
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
                      onClick={() => setShowDeleteConfirm(group.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No groups found</h3>
              <p className="text-white/70">
                {searchTerm ? 'Try adjusting your search terms.' : 'Create your first voice group to get started.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Members of {activeTab === 'channels' 
                  ? (selectedItem as Channel).name 
                  : `${(selectedItem as VoiceGroup).channel.name} - Group ${(selectedItem as VoiceGroup).groupNumber}`}
              </h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedItem.members && selectedItem.members.length > 0 ? (
                selectedItem.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-[#00d9ff]/20 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-[#00d9ff]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{member.name}</div>
                      <div className="text-white/70 text-sm">{member.email}</div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      member.onlineStatus === 'online' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {member.onlineStatus}
                    </div>
                    <button
                      onClick={() => setKickTarget({ id: member.id, name: member.name })}
                      className="ml-2 text-red-400 hover:bg-red-500/20 rounded px-2 py-1 text-xs"
                      title="Kick user"
                    >
                      Kick
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-white/30 mx-auto mb-2" />
                  <p className="text-white/70">No members found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kick confirmation modal */}
      {kickTarget && selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#16181d] shadow-2xl">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h4 className="text-white font-semibold">Remove member</h4>
              <button onClick={() => setKickTarget(null)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-white/80">
                Are you sure you want to remove <span className="font-semibold text-white">{kickTarget.name}</span> from
                {" "}
                {activeTab === 'channels' ? (
                  <span className="text-white">channel</span>
                ) : (
                  <span className="text-white">voice group</span>
                )}?
              </p>
              <div className="text-sm text-white/60 bg-white/5 border border-white/10 rounded-lg p-3">
                This will immediately revoke access. You can re-add the user later if needed.
              </div>
              {kickFeedback && (
                <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                  {kickFeedback}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button onClick={() => setKickTarget(null)} className="px-4 py-2 text-white/80 hover:text-white">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedItem || !kickTarget) return;
                  setKicking(true);
                  setKickFeedback(null);
                  const isChannel = activeTab === 'channels';
                  const endpoint = isChannel
                    ? `/api/admin/channels/${selectedItem.id}/members?memberId=${kickTarget.id}`
                    : `/api/admin/voice-groups/${selectedItem.id}/members?memberId=${kickTarget.id}`;
                  try {
                    const res = await fetch(endpoint, { method: 'DELETE' });
                    if (res.ok) {
                      setSelectedItem({
                        ...selectedItem,
                        members: (selectedItem.members || []).filter(m => m.id !== kickTarget.id)
                      } as any);
                      setKickFeedback('User removed successfully');
                      setTimeout(() => { setKickTarget(null); setKickFeedback(null); }, 900);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      setKickFeedback(err.error || 'Failed to remove member');
                    }
                  } catch (e) {
                    setKickFeedback('Failed to remove member');
                  } finally {
                    setKicking(false);
                  }
                }}
                disabled={kicking}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-60"
              >
                {kicking && <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-400" />}
                Kick member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Create {activeTab === 'channels' ? 'Channel' : 'Voice Group'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              {activeTab === 'channels' ? (
                <>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Channel Name *</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      placeholder="Enter channel name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Topic/Description</label>
                    <textarea
                      value={createForm.topic}
                      onChange={(e) => setCreateForm({...createForm, topic: e.target.value})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      placeholder="Enter channel topic..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Category</label>
                    <select
                      value={createForm.category}
                      onChange={(e) => setCreateForm({...createForm, category: e.target.value})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    >
                      <option value="General">General</option>
                      <option value="Programming">Programming</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Computer General">Computer General</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Visibility</label>
                    <select
                      value={createForm.visibility}
                      onChange={(e) => setCreateForm({...createForm, visibility: e.target.value as 'public' | 'private'})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Channel *</label>
                    <select
                      value={createForm.channelId}
                      onChange={(e) => setCreateForm({...createForm, channelId: e.target.value})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    >
                      <option value="">Select a channel...</option>
                      {channels.map(channel => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name} ({channel.visibility})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Group Number *</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={createForm.groupNumber}
                      onChange={(e) => setCreateForm({...createForm, groupNumber: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Max Members</label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={createForm.maxMembers}
                      onChange={(e) => setCreateForm({...createForm, maxMembers: parseInt(e.target.value) || 8})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={createForm.tags.join(', ')}
                      onChange={(e) => setCreateForm({...createForm, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      placeholder="gaming, study, casual..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.isTemp}
                        onChange={(e) => setCreateForm({...createForm, isTemp: e.target.checked})}
                        className="rounded border-white/20 bg-white/10 text-[#00d9ff] focus:ring-[#00d9ff]/50"
                      />
                      <span className="text-white/70">Temporary Group</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.isRandom}
                        onChange={(e) => setCreateForm({...createForm, isRandom: e.target.checked})}
                        className="rounded border-white/20 bg-white/10 text-[#00d9ff] focus:ring-[#00d9ff]/50"
                      />
                      <span className="text-white/70">Random Matching</span>
                    </label>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d9ff]"></div>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create {activeTab === 'channels' ? 'Channel' : 'Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Edit {activeTab === 'channels' ? 'Channel' : 'Voice Group'}
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              {activeTab === 'channels' ? (
                <>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Channel Name *</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      placeholder="Enter channel name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Topic/Description</label>
                    <textarea
                      value={createForm.topic}
                      onChange={(e) => setCreateForm({...createForm, topic: e.target.value})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      placeholder="Enter channel topic..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Category</label>
                    <select
                      value={createForm.category}
                      onChange={(e) => setCreateForm({...createForm, category: e.target.value})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    >
                      <option value="General">General</option>
                      <option value="Programming">Programming</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Computer General">Computer General</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Visibility</label>
                    <select
                      value={createForm.visibility}
                      onChange={(e) => setCreateForm({...createForm, visibility: e.target.value as 'public' | 'private'})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Channel *</label>
                    <select
                      value={createForm.channelId}
                      onChange={(e) => setCreateForm({...createForm, channelId: e.target.value})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    >
                      {channels.map(channel => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name} ({channel.visibility})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Group Number *</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={createForm.groupNumber}
                      onChange={(e) => setCreateForm({...createForm, groupNumber: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Max Members</label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={createForm.maxMembers}
                      onChange={(e) => setCreateForm({...createForm, maxMembers: parseInt(e.target.value) || 8})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={createForm.tags.join(', ')}
                      onChange={(e) => setCreateForm({...createForm, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
                      placeholder="gaming, study, casual..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.isTemp}
                        onChange={(e) => setCreateForm({...createForm, isTemp: e.target.checked})}
                        className="rounded border-white/20 bg-white/10 text-[#00d9ff] focus:ring-[#00d9ff]/50"
                      />
                      <span className="text-white/70">Temporary Group</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.isRandom}
                        onChange={(e) => setCreateForm({...createForm, isRandom: e.target.checked})}
                        className="rounded border-white/20 bg-white/10 text-[#00d9ff] focus:ring-[#00d9ff]/50"
                      />
                      <span className="text-white/70">Random Matching</span>
                    </label>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={editing}
                className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d9ff]"></div>
                ) : (
                  <Edit className="h-4 w-4" />
                )}
                Update {activeTab === 'channels' ? 'Channel' : 'Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
