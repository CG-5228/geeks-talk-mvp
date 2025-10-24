"use client";
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic, MicOff, PhoneOff, Users, MoreVertical, User, Flag, Vote } from 'lucide-react';
import VoiceCanvas from './VoiceCanvas';
import VoteKickPoll from './VoteKickPoll';
import GroupTags from './GroupTags';
import GroupFileShare from './GroupFileShare';
import ReportDialog from './ReportDialog';
import VoiceIntegration from './VoiceIntegration';
import { useVoiceIndicators } from './VoiceIndicators';
import { useStyledDialog } from '../ui/StyledDialog';
import AudibleAlertIcon from './AudibleAlertIcon';

interface GroupRoomProps {
  groupId: string;
  onLeave: () => void;
}

export default function GroupRoom({ groupId, onLeave }: GroupRoomProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showDialog, DialogComponent } = useStyledDialog();
  const { isConnected, speakingStates, isUserSpeaking, getUserVolume, handleSpeakingChange } = useVoiceIndicators(groupId);

  useEffect(() => {
    // Fetch initial members
    fetchMembers();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchMembers, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, [groupId]);

  // Add keyboard shortcut for emergency exit (Escape key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleLeave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/voice/groups/${groupId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleLocalSpeakingChange = (speaking: boolean) => {
    setIsSpeaking(speaking);
  };

  const handleUserSpeakingChange = (userId: string, speaking: boolean, volume?: number) => {
    handleSpeakingChange(userId, speaking, volume);
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsVoiceConnected(connected);
  };

  const handlePushToTalkChange = (active: boolean) => {
    setIsPushToTalkActive(active);
  };

  const handleLeave = async () => {
    try {
      await fetch(`/api/voice/groups/${groupId}/leave`, {
        method: 'POST',
      });
      onLeave();
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const handleDropdownToggle = (memberId: string) => {
    setOpenDropdown(openDropdown === memberId ? null : memberId);
  };

  const handleVoteKick = async (member: any) => {
    setOpenDropdown(null);
    
    // Show confirmation dialog first
    const confirmed = await new Promise((resolve) => {
      showDialog({
        title: 'Vote to Kick',
        message: `Are you sure you want to start a vote to kick ${member.user.name || member.user.username || 'this user'}?\n\nThis will create a poll that other group members can vote on.`,
        type: 'warning',
        isConfirm: true,
        confirmText: 'Start Vote',
        cancelText: 'Cancel',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/voice/groups/${groupId}/vote-kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: member.userId,
          reason: 'Inappropriate behavior in voice chat',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showDialog({
          title: 'Vote Kick Started',
          message: `Vote kick poll created successfully!\n\nOther group members can now vote on whether to kick ${member.user.name || member.user.username || 'this user'}.`,
          type: 'success',
          autoClose: 5000,
        });
      } else {
        const error = await response.json();
        showDialog({
          title: 'Failed to Start Vote Kick',
          message: error.error || 'Failed to create vote kick poll. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error creating vote kick poll:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to create vote kick poll. Please check your connection and try again.',
        type: 'error',
      });
    }
  };

  const handleViewProfile = (member: any) => {
    setOpenDropdown(null);
    
    // Navigate to the user's profile page
    router.push(`/user/${member.userId}`);
  };

  const handleReport = (member: any) => {
    setOpenDropdown(null);
    setReportTarget(member);
    setShowReportDialog(true);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/20 bg-card/95 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onLeave}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Exit Voice Room (or press Escape)"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Voice Group</h2>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''} online
              </p>
            </div>
          </div>
          
          {/* Emergency Exit Button */}
          <button
            onClick={onLeave}
            className="px-4 py-2 text-sm bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors"
            title="Exit Voice Room"
          >
            Exit Room
          </button>
          
          <div className="flex items-center gap-2">
            <VoiceIntegration 
              groupId={groupId} 
              onSpeakingChange={handleLocalSpeakingChange}
              onUserSpeakingChange={handleUserSpeakingChange}
              onConnectionChange={handleConnectionChange}
              onPushToTalkChange={handlePushToTalkChange}
              onLeaveGroup={handleLeave}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Canvas Area (Center) */}
        <div className="flex-1 p-6">
          <div className="h-full rounded-xl border border-border/20 bg-card/95 backdrop-blur-xl">
            <VoiceCanvas groupId={groupId} />
          </div>
        </div>

        {/* Members Sidebar (Right) */}
        <div className="w-80 border-l border-border/20 bg-card/95 backdrop-blur-xl flex flex-col">
          {/* Vote Kick Polls */}
          <VoteKickPoll groupId={groupId} />
          
          {/* Group Tags */}
          <GroupTags groupId={groupId} />
          
          {/* File Sharing */}
          <GroupFileShare groupId={groupId} />
          
          <div className="flex-1 p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Members</h3>
          
          <div className="space-y-3">
            {members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No members yet</p>
              </div>
            ) : (
              members.map((member) => {
                const isCurrentUser = member.userId === session?.user?.id;
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            {member.user.image ? (
                              <img
                                src={member.user.image}
                                alt={member.user.name || member.user.username || 'User'}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <span className="text-sm font-medium text-primary">
                                {(member.user.name || member.user.username || 'U').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {(member.isSpeaking || isUserSpeaking(member.userId)) && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                          )}
                        </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.user.name || member.user.username || 'Anonymous'}
                          {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                        </p>
                        <AudibleAlertIcon
                          isSpeaking={member.isSpeaking || isUserSpeaking(member.userId)}
                          volume={getUserVolume(member.userId)}
                          userId={member.userId}
                          className="flex-shrink-0"
                        />
                        {/* Debug info - remove this later */}
                        {isCurrentUser && (
                          <span className="text-xs text-yellow-400 ml-2">
                            S:{member.isSpeaking || isUserSpeaking(member.userId) ? 'Y' : 'N'} 
                            V:{getUserVolume(member.userId).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(member.isSpeaking || isUserSpeaking(member.userId)) ? 'Speaking' : 'Listening'}
                      </p>
                    </div>
                    
                    {/* Only show three-dots menu for other users, not current user */}
                    {!isCurrentUser && (
                      <div className="relative" ref={dropdownRef}>
                        <button 
                          onClick={() => handleDropdownToggle(member.id)}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openDropdown === member.id && (
                          <div className="absolute right-0 top-8 w-48 bg-card/95 backdrop-blur-xl border border-border/20 rounded-lg shadow-lg z-50">
                            <div className="py-1">
                              <button
                                onClick={() => handleVoteKick(member)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-white/10 transition-colors flex items-center gap-3"
                              >
                                <Vote className="w-4 h-4 text-orange-400" />
                                Vote to Kick
                              </button>
                              <button
                                onClick={() => handleViewProfile(member)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-white/10 transition-colors flex items-center gap-3"
                              >
                                <User className="w-4 h-4 text-blue-400" />
                                View Profile
                              </button>
                              <button
                                onClick={() => handleReport(member)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-white/10 transition-colors flex items-center gap-3"
                              >
                                <Flag className="w-4 h-4 text-red-400" />
                                Report User
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="border-t border-border/20 bg-card/95 backdrop-blur-xl p-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${isVoiceConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isVoiceConnected ? 'Voice Connected' : 'Voice Disconnected'}</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {isPushToTalkActive ? (
                <span className="text-green-400">Push to Talk: Active (Hold Space)</span>
              ) : isSpeaking ? (
                <span className="text-green-400">Speaking</span>
              ) : (
                <span>Listening</span>
              )}
            </div>
          </div>
      </div>
      
      {/* Styled Dialog */}
      <DialogComponent />
      
      {/* Report Dialog */}
      {showReportDialog && reportTarget && (
        <ReportDialog
          isOpen={showReportDialog}
          onClose={() => {
            setShowReportDialog(false);
            setReportTarget(null);
          }}
          targetUser={reportTarget.user}
          groupId={groupId}
        />
      )}
    </div>
  );
}
