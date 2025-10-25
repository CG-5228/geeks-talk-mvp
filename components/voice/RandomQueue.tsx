"use client";
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Users, UserPlus, Clock, X, CheckCircle, ArrowLeft } from 'lucide-react';
import { useStyledDialog } from '../ui/StyledDialog';
import RandomChatOptions from './RandomChatOptions';
import TopicSelection from './TopicSelection';
import OneOnOneRoom from './OneOnOneRoom';

type ViewState = 'chat-options' | 'topic-selection' | 'queue' | 'matched' | 'in-room';

export default function RandomQueue() {
  const { data: session } = useSession();
  const [view, setView] = useState<ViewState>('chat-options');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [matchData, setMatchData] = useState<{
    roomName: string;
    peerId: string;
    peerTopics: string[];
  } | null>(null);
  const [waitingTime, setWaitingTime] = useState(0);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const { showDialog, DialogComponent } = useStyledDialog();

  // Handle chat type selection
  const handleSelectOneOnOne = useCallback(() => {
    setView('topic-selection');
  }, []);

  const handleSelectGroupChat = useCallback(() => {
    // For now, show a message that group chat is coming soon
    showDialog({
      title: 'Group Chat Coming Soon',
      message: 'Group chat functionality is currently under development. Please try one-on-one chat for now.',
      type: 'info'
    });
  }, [showDialog]);

  const handleBackToOptions = useCallback(() => {
    setView('chat-options');
  }, []);

  // Start matching with selected topics
  const handleStartMatching = useCallback(async (topics: string[]) => {
    if (!session?.user?.id) return;

    setSelectedTopics(topics);
    setView('queue');
    setWaitingTime(0);

    try {
      const response = await fetch('/api/voice/random/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topics }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matched) {
          setMatchData({
            roomName: data.roomName,
            peerId: data.peerId,
            peerTopics: data.peerTopics,
          });
          setView('matched');
        } else {
          // Start polling for match
          startPolling();
        }
      } else {
        const error = await response.json();
        showDialog({
          title: 'Failed to join queue',
          message: error.error || 'Failed to join queue',
          type: 'error'
        });
        setView('chat-options');
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      showDialog({
        title: 'Connection Error',
        message: 'Failed to join queue. Please check your connection and try again.',
        type: 'error'
      });
      setView('chat-options');
    }
  }, [session?.user?.id, showDialog]);

  // Start polling for match
  const startPolling = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        console.log('Polling for match...');
        const response = await fetch('/api/voice/random/queue/status');
        if (response.ok) {
          const data = await response.json();
          console.log('Poll response:', data);
          if (data.matched) {
            console.log('Match found! Transitioning to matched view');
            setMatchData({
              roomName: data.roomName,
              peerId: data.peerId,
              peerTopics: data.peerTopics,
            });
            setView('matched');
            clearInterval(interval);
            setPollInterval(null);
          }
        } else {
          console.log('Poll response not ok:', response.status);
        }
      } catch (error) {
        console.error('Error polling for match:', error);
      }
    }, 2000); // Poll every 2 seconds

    setPollInterval(interval);
  }, []);

  // Leave queue
  const handleLeaveQueue = useCallback(async () => {
    try {
      await fetch('/api/voice/random/queue', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error leaving queue:', error);
    }

    // Clear polling
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    // Reset state
    setView('chat-options');
    setWaitingTime(0);
    setMatchData(null);
    setSelectedTopics([]);
  }, [pollInterval]);

  // Join room
  const handleJoinRoom = useCallback(() => {
    setView('in-room');
  }, []);

  // Leave room
  const handleLeaveRoom = useCallback(() => {
    setView('chat-options');
    setMatchData(null);
    setSelectedTopics([]);
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update waiting time
  useEffect(() => {
    if (view === 'queue') {
      const timer = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [view]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // If user is in a voice room, show the OneOnOneRoom component
  if (view === 'in-room' && matchData) {
    return (
      <OneOnOneRoom 
        roomName={matchData.roomName}
        peerId={matchData.peerId}
        peerTopics={matchData.peerTopics}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Chat Options View */}
      {view === 'chat-options' && (
        <RandomChatOptions 
          onSelectOneOnOne={handleSelectOneOnOne}
          onSelectGroupChat={handleSelectGroupChat}
        />
      )}

      {/* Topic Selection View */}
      {view === 'topic-selection' && (
        <div>
          <div className="mb-6">
            <button
              onClick={handleBackToOptions}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <TopicSelection onStartMatching={handleStartMatching} />
        </div>
      )}

      {/* Queue View */}
      {view === 'queue' && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Looking for a partner...
          </h3>
          <p className="text-muted-foreground mb-4">
            Waiting time: {formatTime(waitingTime)}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            We'll match you as soon as someone else joins the queue.
          </p>
          
          {/* Selected Topics Display */}
          {selectedTopics.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Your topics:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {selectedTopics.map((topic) => (
                  <span
                    key={topic}
                    className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleLeaveQueue}
            className="px-6 py-2 border border-border/20 rounded-lg text-foreground hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Matched View */}
      {view === 'matched' && matchData && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Match Found!</h3>
          <p className="text-muted-foreground mb-6">
            You've been matched for a 1-on-1 voice chat.
          </p>
          
          {/* Peer Topics Display */}
          {matchData.peerTopics.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Your partner's topics:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {matchData.peerTopics.map((topic) => (
                  <span
                    key={topic}
                    className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleJoinRoom}
              className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Join Voice Chat
            </button>
            <button
              onClick={handleLeaveQueue}
              className="w-full py-2 px-6 border border-border/20 rounded-lg text-foreground hover:bg-white/10 transition-colors"
            >
              Decline Match
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
          <h4 className="font-medium text-foreground mb-2">Topic-Based</h4>
          <p className="text-sm text-muted-foreground">
            Match with users who share your interests
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-medium text-foreground mb-2">End-to-End Encrypted</h4>
          <p className="text-sm text-muted-foreground">
            Your conversations are fully encrypted
          </p>
        </div>
      </div>

      {/* Styled Dialog */}
      <DialogComponent />
    </div>
  );
}