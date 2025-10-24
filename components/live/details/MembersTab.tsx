"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ThumbsUp, Info, Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import LikeLimitModal from '@/components/ui/LikeLimitModal';
import { useLikeLimitModal } from '@/hooks/useLikeLimitModal';

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
  const { modalState, showLikeLimit, hideLikeLimit } = useLikeLimitModal();

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchMembers();
    }, 300);

    return () => clearTimeout(debounceTimer);
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

  const handleLike = useCallback(async (memberId: string) => {
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
      } else if (response.status === 429) {
        // Rate limit exceeded - show custom modal
        const maxLikes = parseInt(process.env.NEXT_PUBLIC_MAX_LIKES_PER_USER_PER_HOUR || '4', 10);
        showLikeLimit(maxLikes, '1 hour');
      } else {
        console.error('Error liking user:', data.error || 'Unknown error');
        alert(data.error || 'Failed to like user. Please try again.');
      }
    } catch (error) {
      console.error('Error liking user:', error);
      alert('Failed to like user. Please try again.');
    } finally {
      setLikingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
    }
  }, [likingUsers]);

  const handleViewProfile = useCallback((memberId: string) => {
    router.push(`/user/${memberId}`);
  }, [router]);

  const getOnlineStatus = useCallback((member: Member) => {
    if (member.onlineStatus === 'online') {
      return { text: 'Online', color: 'text-emerald-400', dot: 'bg-emerald-500', animate: 'animate-pulse' };
    }
    
    if (member.lastSeen) {
      const lastSeen = new Date(member.lastSeen);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
      
      if (diffMinutes < 5) {
        return { text: 'Just now', color: 'text-emerald-400', dot: 'bg-emerald-500', animate: 'animate-pulse' };
      } else if (diffMinutes < 60) {
        return { text: `${diffMinutes}m ago`, color: 'text-amber-400', dot: 'bg-amber-500', animate: '' };
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        return { text: `${hours}h ago`, color: 'text-amber-400', dot: 'bg-amber-500', animate: '' };
      }
    }
    
    return { text: 'Offline', color: 'text-slate-500', dot: 'bg-slate-600', animate: '' };
  }, []);

  const filteredAndSortedMembers = useMemo(() => {
    return members.sort((a, b) => {
      // Sort online users first
      const aIsOnline = a.onlineStatus === 'online' ? 1 : 0;
      const bIsOnline = b.onlineStatus === 'online' ? 1 : 0;
      if (aIsOnline !== bIsOnline) return bIsOnline - aIsOnline;
      
      // Then by name
      const aName = (a.name || a.username || '').toLowerCase();
      const bName = (b.name || b.username || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [members]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-transparent via-white/[0.01] to-white/[0.02]">
      {/* Search Bar */}
      <div className="p-4 border-b border-white/5 flex-shrink-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.4)] group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[rgba(220,235,255,0.9)] placeholder-[rgba(220,235,255,0.4)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 text-sm"
          />
        </div>
      </div>

      {/* Members List or States */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-[rgba(220,235,255,0.5)]">Loading members...</p>
          </div>
        )}

        {error && (
          <div className="m-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && filteredAndSortedMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <Users className="w-12 h-12 text-[rgba(220,235,255,0.2)]" />
            <p className="text-sm text-[rgba(220,235,255,0.5)]">
              {searchQuery ? 'No members found' : 'No members in this channel'}
            </p>
          </div>
        )}

        {!loading && !error && filteredAndSortedMembers.length > 0 && (
          <div className="p-3 space-y-2">
            {filteredAndSortedMembers.map((member) => {
              const status = getOnlineStatus(member);
              const isLiking = likingUsers.has(member.id);
              
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all duration-200 group"
                >
                  {/* Avatar with Status */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={member.image || '/default-avatar.png'}
                      alt={member.name || 'User'}
                      className="w-10 h-10 rounded-full ring-2 ring-white/10 group-hover:ring-white/20 transition-all"
                    />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#13141a] ${status.dot} ${status.animate}`} />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h4 className="font-medium text-[rgba(220,235,255,0.9)] truncate text-sm">
                        {member.name || member.username || 'Unknown'}
                      </h4>
                      <span className="text-xs font-semibold text-blue-400 flex-shrink-0">
                        {member.likesCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`${status.color} font-medium`}>{status.text}</span>
                      {member.username && (
                        <span className="text-[rgba(220,235,255,0.4)]">@{member.username}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Like Button */}
                    <button
                      onClick={() => handleLike(member.id)}
                      disabled={!member.canLike || isLiking}
                      className={`p-1.5 rounded-md transition-all duration-200 ${
                        member.canLike && !isLiking
                          ? 'hover:bg-blue-500/20 text-[rgba(220,235,255,0.6)] hover:text-blue-400'
                          : 'opacity-40 cursor-not-allowed text-[rgba(220,235,255,0.3)]'
                      }`}
                      title={
                        member.canLike 
                          ? `Like (${member.remainingLikes} left)` 
                          : 'Like limit reached'
                      }
                    >
                      <ThumbsUp className={`w-4 h-4 ${member.isLiked ? 'fill-current text-blue-400' : ''}`} />
                    </button>

                    {/* Info Button */}
                    <button
                      onClick={() => handleViewProfile(member.id)}
                      className="p-1.5 rounded-md hover:bg-white/10 text-[rgba(220,235,255,0.6)] hover:text-white transition-all duration-200"
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

      {/* Footer Stats */}
      {!loading && !error && filteredAndSortedMembers.length > 0 && (
        <div className="p-3 border-t border-white/5 bg-white/[0.02] text-xs text-[rgba(220,235,255,0.4)] flex-shrink-0">
          <div className="flex justify-between">
            <span>{filteredAndSortedMembers.length} member{filteredAndSortedMembers.length !== 1 ? 's' : ''}</span>
            <span>{filteredAndSortedMembers.filter(m => m.onlineStatus === 'online').length} online</span>
          </div>
        </div>
      )}

      {/* Like Limit Modal */}
      <LikeLimitModal
        isOpen={modalState.isOpen}
        onClose={hideLikeLimit}
        maxLikes={modalState.maxLikes}
        remainingTime={modalState.remainingTime}
      />
    </div>
  );
}
