"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Users, Hash } from 'lucide-react';
import GroupRoom from './GroupRoom';
import { useStyledDialog } from '../ui/StyledDialog';

interface Group {
  id: string;
  groupNumber: number;
  tags: string[];
  maxMembers: number;
  memberCount: number;
  members: Array<{
    id: string;
    userId: string;
    joinOrder: number;
    isSpeaking: boolean;
    pushToTalk: boolean;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
    };
  }>;
  createdAt: string;
}

interface Channel {
  id: string;
  name: string;
  slug: string;
}

interface GroupListProps {
  channelId: string;
  onBack: () => void;
  onGroupJoined?: (groupId: string) => void;
}

export default function GroupList({ channelId, onBack, onGroupJoined }: GroupListProps) {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [userCurrentGroup, setUserCurrentGroup] = useState<{id: string, groupNumber: number, channelName: string} | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const { showDialog, DialogComponent } = useStyledDialog();

  useEffect(() => {
    fetchGroups();
    fetchChannel();
  }, [channelId]);

  // Auto-seed groups if none exist
  useEffect(() => {
    if (groups.length === 0 && !loading && channelId) {
      seedGroups();
    }
  }, [groups.length, loading, channelId]);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`/api/voice/groups?channelId=${channelId}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannel = async () => {
    try {
      const response = await fetch(`/api/live/channels/${channelId}`);
      if (response.ok) {
        const data = await response.json();
        setChannel(data.channel);
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
    }
  };

  const seedGroups = async () => {
    console.log('🌱 Seeding groups for channel:', channelId);
    try {
      const response = await fetch(`/api/voice/groups/seed?channelId=${channelId}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🌱 Groups seeded successfully:', data);
        setGroups(data.groups || []);
        setLoading(false);
      } else {
        const errorData = await response.json();
        console.error('🌱 Failed to seed groups:', errorData);
        setLoading(false);
      }
    } catch (error) {
      console.error('🌱 Error seeding groups:', error);
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!session?.user?.id) return;

    setJoining(groupId);
    try {
      const response = await fetch(`/api/voice/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Navigate to the voice room immediately
        setSelectedGroup(groupId);

        // Notify parent component that user joined a group
        onGroupJoined?.(groupId);
        // Refresh groups to show updated member counts
        fetchGroups();
        // TODO: Initialize LiveKit connection with data.liveKitToken
      } else {
        const error = await response.json();
        console.error('Join group error:', error);

        if (error.currentGroup) {
          setUserCurrentGroup(error.currentGroup);
          showDialog({
            title: 'Already in a Group',
            message: `${error.error}\n\nWould you like to leave your current group and join this one?`,
            type: 'warning'
          });
        } else {
          showDialog({
            title: 'Join Failed',
            message: error.error || 'Failed to join group',
            type: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Error joining group:', error);
      showDialog({
        title: 'Network Error',
        message: 'Please check your connection and try again.',
        type: 'error'
      });
    } finally {
      setJoining(null);
    }
  };

  const handleLeaveGroup = () => {
    setSelectedGroup(null);
    fetchGroups(); // Refresh groups
  };

  const handleLeaveCurrentGroupAndJoin = async (targetGroupId: string) => {
    if (!userCurrentGroup) return;

    try {
      // Leave current group
      const leaveResponse = await fetch(`/api/voice/groups/${userCurrentGroup.id}/leave`, {
        method: 'POST',
      });

      if (leaveResponse.ok) {
        setUserCurrentGroup(null);
        // Now join the target group
        await handleJoinGroup(targetGroupId);
      } else {
        showDialog({
          title: 'Leave Failed',
          message: 'Failed to leave current group',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error leaving current group:', error);
      showDialog({
        title: 'Leave Failed',
        message: 'Failed to leave current group',
        type: 'error'
      });
    }
  };

  const handleCleanupAllGroups = async () => {
    if (!confirm('This will remove you from ALL voice groups. Are you sure?')) {
      return;
    }

    setCleaningUp(true);
    try {
      const response = await fetch('/api/voice/groups/cleanup', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        showDialog({
          title: 'Groups Left',
          message: `Successfully left ${data.leftGroups.length} group(s):\n${data.leftGroups.map((g: any) => `• Group ${g.groupNumber} in ${g.channelName}`).join('\n')}`,
          type: 'success',
          autoClose: 5000
        });
        setUserCurrentGroup(null);
        fetchGroups(); // Refresh the groups list
      } else {
        const error = await response.json();
        showDialog({
          title: 'Cleanup Failed',
          message: error.error || 'Failed to cleanup groups',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error cleaning up groups:', error);
      showDialog({
        title: 'Cleanup Failed',
        message: 'Failed to cleanup groups',
        type: 'error'
      });
    } finally {
      setCleaningUp(false);
    }
  };

  if (selectedGroup) {
    return (
      <GroupRoom
        groupId={selectedGroup}
        onLeave={handleLeaveGroup}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Hash className="w-5 h-5" />
              {channel?.name || 'Channel'}
            </h2>
            <p className="text-muted-foreground">
              Choose a voice group to join and start collaborating.
            </p>
          </div>
        </div>

        {/* Cleanup Button - only show if user is in multiple groups */}
        {groups.some(group => group.members.some(member => member.userId === session?.user?.id)) && (
          <button
            onClick={handleCleanupAllGroups}
            disabled={cleaningUp}
            className="px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {cleaningUp ? 'Cleaning Up...' : 'Leave All Groups'}
          </button>
        )}
      </div>

      {userCurrentGroup && (
        <div className="mb-6 p-4 rounded-xl border border-orange-500/20 bg-orange-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <div>
                <p className="text-sm font-medium text-orange-200">
                  Currently in Group {userCurrentGroup.groupNumber} in {userCurrentGroup.channelName}
                </p>
                <p className="text-xs text-orange-300/70">
                  Leave this group to join another one
                </p>
              </div>
            </div>
            <button
              onClick={() => handleLeaveCurrentGroupAndJoin('')}
              className="px-3 py-1.5 text-xs font-medium text-orange-200 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg transition-colors"
            >
              Leave Group
            </button>
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groups.map((group) => {
          const isUserInGroup = group.members.some(member => member.userId === session?.user?.id);
          const isFull = group.memberCount >= group.maxMembers;

          return (
            <div
              key={group.id}
              className="p-6 rounded-xl border border-border/20 bg-card/95 backdrop-blur-xl hover:bg-card/100 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-foreground">
                  Group {group.groupNumber}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{group.memberCount}/{group.maxMembers}</span>
                </div>
              </div>

              {/* Tags */}
              {group.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {group.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Members */}
              <div className="space-y-2 mb-4">
                {group.members.slice(0, 3).map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      {member.user.image ? (
                        <img
                          src={member.user.image}
                          alt={member.user.name || member.user.username || 'User'}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <span className="text-xs font-medium text-primary">
                          {(member.user.name || member.user.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-foreground truncate">
                      {member.user.name || member.user.username || 'Anonymous'}
                    </span>
                    {member.isSpeaking && (
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </div>
                ))}
                {group.members.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{group.members.length - 3} more
                  </div>
                )}
              </div>

              {/* Join Button */}
              <button
                onClick={() => handleJoinGroup(group.id)}
                disabled={isUserInGroup || isFull || joining === group.id || (userCurrentGroup !== null && !isUserInGroup)}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  isUserInGroup
                    ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                    : isFull
                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                    : joining === group.id
                    ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                    : userCurrentGroup !== null && !isUserInGroup
                    ? 'bg-orange-500/20 text-orange-500 cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {isUserInGroup
                  ? 'Joined'
                  : isFull
                  ? 'Full'
                  : joining === group.id
                  ? 'Joining...'
                  : userCurrentGroup !== null && !isUserInGroup
                  ? 'Leave Current Group First'
                  : 'Join Group'}
              </button>
            </div>
          );
        })}
      </div>

      {groups.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Creating voice groups...</h3>
          <p className="text-muted-foreground">
            Setting up 4 default voice groups for this channel.
          </p>
        </div>
      )}

      {/* Styled Dialog */}
      <DialogComponent />
    </div>
  );
}
