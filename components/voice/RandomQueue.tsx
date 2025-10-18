"use client";
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Users, UserPlus, Clock } from 'lucide-react';

export default function RandomQueue() {
  const { data: session } = useSession();
  const [queueStatus, setQueueStatus] = useState<'idle' | 'waiting' | 'matched'>('idle');
  const [queueType, setQueueType] = useState<'1v1' | 'group'>('1v1');
  const [waitingTime, setWaitingTime] = useState(0);

  const handleJoinQueue = async (type: '1v1' | 'group') => {
    if (!session?.user?.id) return;
    
    setQueueType(type);
    setQueueStatus('waiting');
    setWaitingTime(0);

    try {
      const response = await fetch('/api/voice/random/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matched) {
          setQueueStatus('matched');
          // TODO: Initialize LiveKit connection with data.liveKitToken
        } else {
          // Start waiting timer
          const timer = setInterval(() => {
            setWaitingTime(prev => prev + 1);
          }, 1000);

          // Simulate matching after 10 seconds for demo
          setTimeout(() => {
            clearInterval(timer);
            setQueueStatus('matched');
          }, 10000);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to join queue');
        setQueueStatus('idle');
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Failed to join queue');
      setQueueStatus('idle');
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await fetch('/api/voice/random/queue', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
    setQueueStatus('idle');
    setWaitingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Random Chat</h2>
        <p className="text-muted-foreground">
          Connect with random users for voice conversations. Choose between 1-on-1 chats or small groups.
        </p>
      </div>

      {queueStatus === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1-on-1 Chat */}
          <div className="p-8 rounded-xl border border-border/20 bg-card/95 backdrop-blur-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">1-on-1 Chat</h3>
            <p className="text-muted-foreground mb-6">
              Get matched with a random person for a private voice conversation.
            </p>
            <button
              onClick={() => handleJoinQueue('1v1')}
              className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Find Random Partner
            </button>
          </div>

          {/* Random Group */}
          <div className="p-8 rounded-xl border border-border/20 bg-card/95 backdrop-blur-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Random Group</h3>
            <p className="text-muted-foreground mb-6">
              Join a small group of 3-4 random people for collaborative discussions.
            </p>
            <button
              onClick={() => handleJoinQueue('group')}
              className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Join Random Group
            </button>
          </div>
        </div>
      )}

      {queueStatus === 'waiting' && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Looking for {queueType === '1v1' ? 'a partner' : 'a group'}...
          </h3>
          <p className="text-muted-foreground mb-4">
            Waiting time: {formatTime(waitingTime)}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            We'll match you as soon as someone else joins the queue.
          </p>
          <button
            onClick={handleLeaveQueue}
            className="px-6 py-2 border border-border/20 rounded-lg text-foreground hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {queueStatus === 'matched' && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Match Found!</h3>
          <p className="text-muted-foreground mb-6">
            You've been matched for a {queueType === '1v1' ? '1-on-1' : 'group'} voice chat.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                // TODO: Navigate to voice room
                console.log('Starting voice chat...');
              }}
              className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Start Voice Chat
            </button>
            <button
              onClick={handleLeaveQueue}
              className="w-full py-2 px-6 border border-border/20 rounded-lg text-foreground hover:bg-white/10 transition-colors"
            >
              Leave Match
            </button>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-medium text-foreground mb-2">Quick Matching</h4>
          <p className="text-sm text-muted-foreground">
            Get matched with other users in seconds
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-medium text-foreground mb-2">Flexible Options</h4>
          <p className="text-sm text-muted-foreground">
            Choose between 1-on-1 or group conversations
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-medium text-foreground mb-2">Easy Invites</h4>
          <p className="text-sm text-muted-foreground">
            Invite friends to join your random chat
          </p>
        </div>
      </div>
    </div>
  );
}
