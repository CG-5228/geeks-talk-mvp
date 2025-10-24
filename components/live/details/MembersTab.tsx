"use client";
import { useState, useEffect } from 'react';
import { Search, ThumbsUp, Info, Users, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  onlineStatus: string;
  lastSeen: string | null;
  likesCount: number;
  createdAt: string;
  canLike: boolean;
  isLiked: boolean;
  remainingLikes: number;
}

interface MembersTabProps {
  channelId: string;
}

export default function MembersTab({ channelId }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likingUsers, setLikingUsers] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchMembers();
  }, [channelId, searchQuery]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      const response = await fetch(`/api/live/channels/${channelId}/members?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      
      const data = await response.json();
      setMembers(data.members);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (memberId: string) => {
    if (likingUsers.has(memberId)) return;
    
    try {
      setLikingUsers(prev => new Set(prev).add(memberId));
      
      const response = await fetch('/api/user/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: memberId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update the member in the list
        setMembers(prev => prev.map(member => 
          member.id === memberId 
            ? { 
                ...member, 
                isLiked: data.isLiked,
                likesCount: data.likesCount,
                remainingLikes: data.remainingLikes,
                canLike: data.canLike
              }
            : member
        ));
      } else {
        console.error('Error liking user:', data.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Error liking user:', error);
    } finally {
      setLikingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
    }
  };

  const handleViewProfile = (memberId: string) => {
    router.push(`/user/${memberId}`);
  };

  const getOnlineStatus = (member: Member) => {
    if (member.onlineStatus === 'online') {
      return { text: 'Online', color: 'text-green-400', dot: 'bg-green-400' };
    }
    
    if (member.lastSeen) {
      const lastSeen = new Date(member.lastSeen);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
      
      if (diffMinutes < 5) {
        return { text: 'Just now', color: 'text-green-400', dot: 'bg-green-400' };
      } else if (diffMinutes < 60) {
        return { text: `${diffMinutes}m ago`, color: 'text-yellow-400', dot: 'bg-yellow-400' };
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        return { text: `${hours}h ago`, color: 'text-yellow-400', dot: 'bg-yellow-400' };
      }
    }
    
    return { text: 'Offline', color: 'text-gray-400', dot: 'bg-gray-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[rgba(220,235,255,0.7)]">Loading members...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-[color:var(--divider)]/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.5)]" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[color:var(--divider)]/20 rounded-lg text-[rgba(220,235,255,0.9)] placeholder-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[rgba(220,235,255,0.7)]">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p>No members found</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {members.map((member) => {
              const status = getOnlineStatus(member);
              const isLiking = likingUsers.has(member.id);
              
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <img
                      src={member.image || '/default-avatar.png'}
                      alt={member.name || 'User'}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[color:var(--surface-1)] ${status.dot}`} />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[rgba(220,235,255,0.9)] truncate">
                        {member.name || member.username || 'Unknown User'}
                      </h4>
                      <span className="text-xs text-[rgba(220,235,255,0.5)]">
                        {member.likesCount} likes
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={status.color}>{status.text}</span>
                      {member.username && (
                        <span className="text-[rgba(220,235,255,0.5)]">@{member.username}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Like Button */}
                    <button
                      onClick={() => handleLike(member.id)}
                      disabled={!member.canLike || isLiking}
                      className={`p-2 rounded-lg transition-colors ${
                        member.canLike && !isLiking
                          ? 'hover:bg-[rgba(255,255,255,0.1)] text-[rgba(220,235,255,0.7)] hover:text-white'
                          : 'opacity-50 cursor-not-allowed text-[rgba(220,235,255,0.3)]'
                      }`}
                      title={
                        member.canLike 
                          ? `Like (${member.remainingLikes} remaining)` 
                          : 'Like limit reached'
                      }
                    >
                      <ThumbsUp className={`w-4 h-4 ${member.isLiked ? 'text-blue-400' : ''}`} />
                    </button>

                    {/* Info Button */}
                    <button
                      onClick={() => handleViewProfile(member.id)}
                      className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
                      title="View profile"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[color:var(--divider)]/20 text-xs text-[rgba(220,235,255,0.5)]">
        {members.length} member{members.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
