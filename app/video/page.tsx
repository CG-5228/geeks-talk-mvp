"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Video, Users, User, Copy, Check, ArrowLeft, Clock, X, Loader2 } from 'lucide-react';
import VideoRoom from '@/components/video/VideoRoom';
import VideoWaitingRoom from '@/components/video/VideoWaitingRoom';

type ChatMode = 'select' | 'one-on-one-queue' | 'one-on-one-matched' | 'group-create' | 'group-join' | 'waiting' | 'in-call';

export default function VideoChatPage() {
  const { data: session } = useSession();
  const [chatMode, setChatMode] = useState<ChatMode>('select');
  const [roomName, setRoomName] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);

  // ============ ONE-ON-ONE RANDOM MATCHING ============

  const handleStartOneOnOne = useCallback(async () => {
    if (!session?.user?.id) {
      setError('Please sign in to start a one-on-one call');
      return;
    }

    setError(null);
    setChatMode('one-on-one-queue');
    setWaitingTime(0);

    try {
      const response = await fetch('/api/video/random/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matched) {
          // Immediate match found
          setRoomName(data.roomName);
          setPeerId(data.peerId);
          setChatMode('one-on-one-matched');
        } else {
          // Start polling for match
          startPolling();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to join queue');
        setChatMode('select');
      }
    } catch (err) {
      console.error('Error joining queue:', err);
      setError('Connection error. Please try again.');
      setChatMode('select');
    }
  }, [session?.user?.id]);

  const startPolling = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/video/random/queue');
        if (response.ok) {
          const data = await response.json();
          if (data.matched) {
            setRoomName(data.roomName);
            setPeerId(data.peerId);
            setChatMode('one-on-one-matched');
            clearInterval(interval);
            setPollInterval(null);
          }
        } else if (response.status === 429) {
          clearInterval(interval);
          setPollInterval(null);
          setError('Too many requests. Please try again later.');
          setChatMode('select');
        }
      } catch (err) {
        console.error('Error polling for match:', err);
      }
    }, 2000);

    setPollInterval(interval);
  }, []);

  const handleLeaveQueue = useCallback(async () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    try {
      await fetch('/api/video/random/queue', { method: 'DELETE' });
    } catch (err) {
      console.error('Error leaving queue:', err);
    }

    setChatMode('select');
    setWaitingTime(0);
    setRoomName(null);
    setPeerId(null);
  }, [pollInterval]);

  const handleJoinOneOnOneCall = useCallback(() => {
    if (roomName) {
      setChatMode('in-call');
    }
  }, [roomName]);

  // ============ GROUP CHAT WITH CODES ============

  const handleCreateGroupRoom = useCallback(async () => {
    if (!session?.user?.id) {
      setError('Please sign in to create a room');
      return;
    }

    setError(null);

    try {
      const response = await fetch('/api/video/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setRoomName(data.roomName);
        setRoomCode(data.roomCode);
        setChatMode('waiting');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create room');
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Connection error. Please try again.');
    }
  }, [session?.user?.id]);

  const handleJoinRoom = useCallback(async () => {
    if (!joinRoomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!session?.user?.id) {
      setError('Please sign in to join a room');
      return;
    }

    if (joinRoomCode.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch(`/api/video/room?code=${joinRoomCode.toUpperCase()}`);
      
      if (response.ok) {
        const data = await response.json();
        setRoomName(data.roomName);
        setRoomCode(data.roomCode);
        setChatMode('waiting');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Room not found');
      }
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Connection error. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }, [joinRoomCode, session?.user?.id]);

  const handleStartCall = useCallback(() => {
    if (roomName) {
      setChatMode('in-call');
    }
  }, [roomName]);

  const handleLeave = useCallback(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    setChatMode('select');
    setRoomName(null);
    setRoomCode(null);
    setJoinRoomCode('');
    setPeerId(null);
    setError(null);
    setWaitingTime(0);
  }, [pollInterval]);

  const handleCopyRoomCode = useCallback(() => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [roomCode]);

  // Update waiting time
  useEffect(() => {
    if (chatMode === 'one-on-one-queue') {
      const timer = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [chatMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============ RENDER VIEWS ============

  // In call - show VideoRoom
  if (chatMode === 'in-call' && roomName) {
    return (
      <div className="fixed inset-0 h-screen w-screen bg-black z-50">
        <VideoRoom roomName={roomName} onLeave={handleLeave} />
      </div>
    );
  }

  // Waiting room for group chat
  if (chatMode === 'waiting' && roomName && roomCode) {
    return (
      <VideoWaitingRoom
        roomName={roomName}
        roomCode={roomCode}
        onStartCall={handleStartCall}
        onLeave={handleLeave}
        isHost={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Video className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white">Video Chat</h1>
                <p className="text-sm text-white/70">Connect face-to-face with your community</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-100">
            {error}
          </div>
        )}

        {/* Mode Selection */}
        {chatMode === 'select' && (
          <div className="text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <Video className="h-16 w-16 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Choose Video Chat Type</h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
                Select how you want to connect with others
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
              {/* One-on-One (Random) */}
              <button
                onClick={handleStartOneOnOne}
                disabled={!session?.user?.id}
                className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Random One-on-One</h3>
                <p className="text-white/70">
                  Get matched randomly with another user for a private video call. Perfect for meeting new people.
                </p>
              </button>
              
              {/* Group */}
              <button
                onClick={handleCreateGroupRoom}
                disabled={!session?.user?.id}
                className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-16 h-16 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Group Call</h3>
                <p className="text-white/70">
                  Create a room and share the code with friends. Great for meetings and group discussions.
                </p>
              </button>
            </div>

            {/* Join Room Section */}
            <div className="max-w-md mx-auto p-6 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Join a Group Room</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  maxLength={6}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-center font-mono text-lg tracking-widest"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinRoom();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  disabled={isJoining || !joinRoomCode.trim() || joinRoomCode.length !== 6}
                  className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>

            {!session?.user?.id && (
              <p className="mt-8 text-white/70 text-sm">
                Please sign in to start or join a video call
              </p>
            )}
          </div>
        )}

        {/* One-on-One Queue View */}
        {chatMode === 'one-on-one-queue' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-10 h-10 text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Looking for a partner...
            </h3>
            <p className="text-white/70 mb-4">
              Waiting time: {formatTime(waitingTime)}
            </p>
            <p className="text-sm text-white/50 mb-6">
              You'll be matched with another user as soon as they join.
            </p>
            <button
              onClick={handleLeaveQueue}
              className="px-6 py-2 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* One-on-One Matched View */}
        {chatMode === 'one-on-one-matched' && roomName && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <User className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Match Found!</h3>
            <p className="text-white/70 mb-6">
              You've been matched for a 1-on-1 video call.
            </p>
            <div className="space-y-3 max-w-xs mx-auto">
              <button
                onClick={handleJoinOneOnOneCall}
                className="w-full py-3 px-6 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                Join Video Call
              </button>
              <button
                onClick={handleLeaveQueue}
                className="w-full py-2 px-6 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
