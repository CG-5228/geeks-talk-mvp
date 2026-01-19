"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Copy, Check, Video, VideoOff, Mic, MicOff, Play, X } from 'lucide-react';

interface VideoWaitingRoomProps {
  roomName: string;
  roomCode: string;
  onStartCall: () => void;
  onLeave: () => void;
  isHost?: boolean;
}

interface Participant {
  id: string;
  name: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export default function VideoWaitingRoom({
  roomName,
  roomCode,
  onStartCall,
  onLeave,
  isHost = true,
}: VideoWaitingRoomProps) {
  const { data: session } = useSession();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize local video preview
  useEffect(() => {
    if (isVideoOn) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          setLocalVideoTrack(track);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((error) => {
          console.error('Failed to get video preview:', error);
          setIsVideoOn(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
        setLocalVideoTrack(null);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
      }
    };
  }, [isVideoOn]);

  // Add current user to participants list
  useEffect(() => {
    if (session?.user) {
      setParticipants([
        {
          id: session.user.id,
          name: session.user.name || 'You',
          isVideoEnabled: isVideoOn,
          isAudioEnabled: isMicOn,
        },
      ]);
    }
  }, [session, isVideoOn, isMicOn]);

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartCall = () => {
    // Stop preview tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onStartCall();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Waiting Room</h2>
          <p className="text-white/70">Share the room code with others to invite them</p>
        </div>

        {/* Room Code */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-white/70 mb-2 block">Room Code</label>
              <div className="text-2xl font-mono font-bold text-white">{roomCode}</div>
            </div>
            <button
              onClick={handleCopyRoomCode}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Video Preview */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Preview</h3>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
              {isVideoOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl font-semibold text-white">
                        {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm">{session?.user?.name || 'You'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`p-3 rounded-full transition-colors ${
                  isVideoOn
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-3 rounded-full transition-colors ${
                  isMicOn
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Participants List */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Participants</h3>
              <div className="flex items-center gap-2 text-white/70">
                <Users className="w-4 h-4" />
                <span className="text-sm">{participants.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {participant.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">{participant.name}</div>
                    {participant.id === session?.user?.id && (
                      <div className="text-xs text-blue-400">(You)</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {participant.isVideoEnabled ? (
                      <Video className="w-4 h-4 text-green-400" />
                    ) : (
                      <VideoOff className="w-4 h-4 text-red-400" />
                    )}
                    {participant.isAudioEnabled ? (
                      <Mic className="w-4 h-4 text-green-400" />
                    ) : (
                      <MicOff className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={onLeave}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
            <span>Leave</span>
          </button>
          {isHost && (
            <button
              onClick={handleStartCall}
              disabled={participants.length < 1}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Play className="w-5 h-5" />
              <span>Start Call</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
