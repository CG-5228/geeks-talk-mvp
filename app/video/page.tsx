"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Video, VideoOff, Mic, MicOff, Users, User, Copy, Check, ArrowLeft } from 'lucide-react';
import VideoRoom from '@/components/video/VideoRoom';
import VideoWaitingRoom from '@/components/video/VideoWaitingRoom';

type ChatMode = 'select' | 'one-on-one' | 'group' | 'waiting' | 'in-call';

export default function VideoChatPage() {
  const { data: session } = useSession();
  const [chatMode, setChatMode] = useState<ChatMode>('select');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate room name
  const generateRoomName = () => {
    if (!session?.user?.id) return null;
    const timestamp = Date.now();
    const userId = session.user.id.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `video-${userId}-${timestamp}`;
  };

  // Generate a shorter, shareable room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleCreateGroupRoom = () => {
    if (!session?.user?.id) {
      setError('Please sign in to create a room');
      return;
    }

    const newRoomName = generateRoomName();
    const newRoomCode = generateRoomCode();
    
    if (newRoomName && newRoomCode) {
      setRoomName(newRoomName);
      setRoomCode(newRoomCode);
      setChatMode('waiting');
      setError(null);
    } else {
      setError('Failed to create room');
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!session?.user?.id) {
      setError('Please sign in to join a room');
      return;
    }

    setIsJoining(true);
    setError(null);

    // For now, use the room code as room name (in production, you'd validate via API)
    // Convert room code to a valid room name format
    const roomNameFromCode = `video-room-${joinRoomCode.trim().toLowerCase()}`;
    setRoomName(roomNameFromCode);
    setRoomCode(joinRoomCode.trim().toUpperCase());
    setChatMode('waiting');
    setIsJoining(false);
  };

  const handleStartOneOnOne = () => {
    // For one-on-one, we could implement matching similar to voice chat
    // For now, create a room and let user invite someone
    if (!session?.user?.id) {
      setError('Please sign in to start a one-on-one call');
      return;
    }

    const newRoomName = generateRoomName();
    const newRoomCode = generateRoomCode();
    
    if (newRoomName && newRoomCode) {
      setRoomName(newRoomName);
      setRoomCode(newRoomCode);
      setChatMode('waiting');
      setError(null);
    }
  };

  const handleStartCall = () => {
    if (roomName) {
      setChatMode('in-call');
    }
  };

  const handleLeave = () => {
    setChatMode('select');
    setRoomName(null);
    setRoomCode(null);
    setJoinRoomCode('');
    setError(null);
  };

  const handleCopyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // In call - show VideoRoom
  if (chatMode === 'in-call' && roomName) {
    return (
      <div className="fixed inset-0 h-screen w-screen bg-black z-50">
        <VideoRoom roomName={roomName} onLeave={handleLeave} />
      </div>
    );
  }

  // Waiting room - show VideoWaitingRoom
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

  // Mode selection or join room
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

        {chatMode === 'select' ? (
          /* Mode Selection */
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

            {/* Mode Selection Cards */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
              {/* One-on-One */}
              <button
                onClick={handleStartOneOnOne}
                disabled={!session?.user?.id}
                className="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">One-on-One</h3>
                <p className="text-white/70">
                  Start a private video call with one person. Perfect for personal conversations.
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
                  Create a room and invite multiple people. Great for meetings and group discussions.
                </p>
              </button>
            </div>

            {/* Join Room Section */}
            <div className="max-w-md mx-auto p-6 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Join a Room</h3>
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
        ) : null}
      </div>
    </div>
  );
}
