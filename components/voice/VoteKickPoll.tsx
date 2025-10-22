"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Vote, User, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useStyledDialog } from '../ui/StyledDialog';
import { useNotifications } from '../ui/NotificationSystem';

interface VoteKickPollProps {
  groupId: string;
}

interface Poll {
  id: string;
  targetId: string;
  reason: string;
  votesFor: string[];
  votesAgainst: string[];
  status: string;
  createdAt: string;
  expiresAt: string;
  target: {
    id: string;
    name: string | null;
    username: string | null;
  };
}

export default function VoteKickPoll({ groupId }: VoteKickPollProps) {
  const { data: session } = useSession();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [previousPolls, setPreviousPolls] = useState<Poll[]>([]);
  const [expiredPolls, setExpiredPolls] = useState<Set<string>>(new Set());
  const [notifiedPolls, setNotifiedPolls] = useState<Set<string>>(new Set());
  const { showDialog, DialogComponent } = useStyledDialog();
  const { showNotification } = useNotifications();

  useEffect(() => {
    // Clear notified polls when group changes
    setNotifiedPolls(new Set());
    fetchPolls();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchPolls, 5000);
    return () => clearInterval(interval);
  }, [groupId]);

  // Auto-cleanup expired polls after 30 seconds
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setPolls(prevPolls => {
        const now = new Date();
        return prevPolls.filter(poll => {
          const expiry = new Date(poll.expiresAt);
          const timeSinceExpiry = now.getTime() - expiry.getTime();
          return timeSinceExpiry <= 30000; // Keep polls that expired less than 30 seconds ago
        });
      });
      
    }, 1000); // Check every second

    return () => clearInterval(cleanupInterval);
  }, []);

  const fetchPolls = async () => {
    try {
      const response = await fetch(`/api/voice/groups/${groupId}/vote-kick`);
      if (response.ok) {
        const data = await response.json();
        const newPolls = data.polls || [];
        
        // Only check for new polls if we have previous polls to compare against
        if (previousPolls.length > 0) {
          // Check for new polls (only show notification for truly new polls)
          const newPollIds = newPolls.map((p: Poll) => p.id);
          const previousPollIds = previousPolls.map((p: Poll) => p.id);
          const newlyCreatedPolls = newPolls.filter((p: Poll) => !previousPollIds.includes(p.id));
          
          // Check for completed polls
          const completedPolls = previousPolls.filter((p: Poll) => 
            p.status === 'active' && !newPollIds.includes(p.id)
          );
          
          // Show notifications for new polls (only if they're not expired and not already notified)
          newlyCreatedPolls.forEach((poll: Poll) => {
            if (poll.targetId !== session?.user?.id && !isPollExpired(poll) && !notifiedPolls.has(poll.id)) {
              showNotification({
                title: 'New Vote-Kick Poll',
                message: `A vote to kick ${poll.target.name || poll.target.username || 'a user'} has been started. Reason: ${poll.reason}`,
                type: 'warning',
                duration: 8000,
              });
              setNotifiedPolls(prev => new Set(prev).add(poll.id));
            }
          });
          
          // Show notifications for completed polls
          completedPolls.forEach((poll: Poll) => {
            const kickVotes = poll.votesFor.length;
            const keepVotes = poll.votesAgainst.length;
            const totalVotes = kickVotes + keepVotes;
            const kickPercentage = totalVotes > 0 ? (kickVotes / totalVotes) * 100 : 0;
            
            if (kickPercentage > 50 && totalVotes >= 3) {
              showNotification({
                title: 'Vote-Kick Passed',
                message: `${poll.target.name || poll.target.username || 'User'} has been removed from the group.`,
                type: 'success',
                duration: 6000,
              });
            } else {
              showNotification({
                title: 'Vote-Kick Failed',
                message: `The vote to kick ${poll.target.name || poll.target.username || 'user'} did not pass.`,
                type: 'info',
                duration: 5000,
              });
            }
          });
        }
        
        setPreviousPolls(newPolls);
        setPolls(newPolls);
      }
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, vote: 'kick' | 'keep') => {
    if (!session?.user?.id) return;

    setVoting(pollId);
    try {
      const response = await fetch(`/api/voice/groups/${groupId}/vote-kick/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vote }),
      });

      if (response.ok) {
        const data = await response.json();
        showNotification({
          title: 'Vote Submitted',
          message: `Your vote has been recorded. ${data.actionTaken ? `User has been ${data.actionTaken}.` : 'Waiting for more votes...'}`,
          type: 'success',
          duration: 4000,
        });
        fetchPolls(); // Refresh polls
      } else {
        const error = await response.json();
        showDialog({
          title: 'Vote Failed',
          message: error.error || 'Failed to submit vote. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to submit vote. Please check your connection and try again.',
        type: 'error',
      });
    } finally {
      setVoting(null);
    }
  };

  const hasVoted = (poll: Poll) => {
    if (!session?.user?.id) return false;
    return poll.votesFor.includes(session.user.id) || poll.votesAgainst.includes(session.user.id);
  };

  const getUserVote = (poll: Poll) => {
    if (!session?.user?.id) return null;
    if (poll.votesFor.includes(session.user.id)) return 'kick';
    if (poll.votesAgainst.includes(session.user.id)) return 'keep';
    return null;
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isPollExpired = (poll: Poll) => {
    const now = new Date();
    const expiry = new Date(poll.expiresAt);
    return expiry.getTime() <= now.getTime();
  };

  const isPollRecentlyExpired = (poll: Poll) => {
    const now = new Date();
    const expiry = new Date(poll.expiresAt);
    const timeSinceExpiry = now.getTime() - expiry.getTime();
    return timeSinceExpiry <= 30000; // 30 seconds
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-white/5 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Filter out polls that are expired and have been expired for more than 30 seconds
  const activePolls = polls.filter(poll => {
    if (!isPollExpired(poll)) return true; // Still active
    if (isPollRecentlyExpired(poll)) return true; // Recently expired, show for 30 seconds
    return false; // Expired for more than 30 seconds, hide
  });

  if (activePolls.length === 0) {
    return null; // Don't show anything if no active or recently expired polls
  }

  return (
    <div className="p-4 border-b border-border/20">
      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <Vote className="w-4 h-4 text-orange-400" />
        {activePolls.some(poll => !isPollExpired(poll)) ? 'Active Vote-Kick Polls' : 'Recent Vote-Kick Results'}
      </h3>
      
      <div className="space-y-3">
        {activePolls.map((poll) => {
          const userVote = getUserVote(poll);
          const timeRemaining = getTimeRemaining(poll.expiresAt);
          const totalVotes = poll.votesFor.length + poll.votesAgainst.length;
          const kickPercentage = totalVotes > 0 ? Math.round((poll.votesFor.length / totalVotes) * 100) : 0;

          const isExpired = isPollExpired(poll);
          const isRecentlyExpired = isPollRecentlyExpired(poll);
          
          return (
            <div key={poll.id} className={`p-3 rounded-lg border ${
              isExpired 
                ? 'bg-gray-500/10 border-gray-500/20' 
                : 'bg-orange-500/10 border-orange-500/20'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Vote to kick <span className="text-orange-400">{poll.target.name || poll.target.username || 'Unknown User'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reason: {poll.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {isExpired ? (
                    <span className="text-gray-400">
                      Expired {Math.max(0, Math.floor((Date.now() - new Date(poll.expiresAt).getTime()) / 1000))}s ago
                    </span>
                  ) : (
                    timeRemaining
                  )}
                </div>
              </div>

              {/* Vote Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Kick: {poll.votesFor.length}</span>
                  <span>Keep: {poll.votesAgainst.length}</span>
                  <span>Total: {totalVotes}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-orange-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${kickPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Vote Buttons */}
              {poll.status === 'active' && !hasVoted(poll) && poll.targetId !== session?.user?.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote(poll.id, 'kick')}
                    disabled={voting === poll.id}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3 h-3" />
                    {voting === poll.id ? 'Voting...' : 'Kick'}
                  </button>
                  <button
                    onClick={() => handleVote(poll.id, 'keep')}
                    disabled={voting === poll.id}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {voting === poll.id ? 'Voting...' : 'Keep'}
                  </button>
                </div>
              )}

              {/* Vote Status */}
              {hasVoted(poll) && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">You voted:</span>
                  <span className={`font-medium ${userVote === 'kick' ? 'text-red-400' : 'text-green-400'}`}>
                    {userVote === 'kick' ? 'Kick' : 'Keep'}
                  </span>
                </div>
              )}

              {poll.targetId === session?.user?.id && (
                <div className="text-xs text-orange-400 font-medium">
                  You are the target of this vote
                </div>
              )}

              {poll.status !== 'active' && (
                <div className="text-xs text-muted-foreground">
                  Poll {poll.status === 'passed' ? 'passed' : 'failed'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DialogComponent />
    </div>
  );
}
