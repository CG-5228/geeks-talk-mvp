"use client";

import { useEffect, useRef, useState } from 'react';
import { RemoteParticipant, LocalParticipant, ConnectionQuality, RemoteVideoTrack, LocalVideoTrack } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, Wifi, WifiOff, Signal, SignalLow, SignalMedium } from 'lucide-react';
import { ParticipantState } from './useVideoRoom';

interface VideoTileProps {
  participantState: ParticipantState;
  isLocal?: boolean;
  isSpotlighted?: boolean;
  onSpotlight?: () => void;
  className?: string;
}

export default function VideoTile({
  participantState,
  isLocal = false,
  isSpotlighted = false,
  onSpotlight,
  className = '',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { participant, videoTrack, audioTrack, isVideoEnabled, isAudioEnabled, connectionQuality } = participantState;

  const participantName = isLocal 
    ? 'You' 
    : (participant as RemoteParticipant).name || participant.identity || 'Unknown';

  // Attach video track to video element
  useEffect(() => {
    if (videoRef.current && videoTrack) {
      videoTrack.attach(videoRef.current);
      return () => {
        videoTrack.detach();
      };
    }
  }, [videoTrack]);

  const getQualityIcon = (quality: ConnectionQuality) => {
    switch (quality) {
      case ConnectionQuality.Excellent:
      case ConnectionQuality.Good:
        return <Signal className="w-4 h-4 text-green-400" />;
      case ConnectionQuality.Poor:
        return <SignalMedium className="w-4 h-4 text-yellow-400" />;
      case ConnectionQuality.Lost:
        return <WifiOff className="w-4 h-4 text-red-400" />;
      default:
        return <SignalLow className="w-4 h-4 text-gray-400" />;
    }
  };

  const getQualityColor = (quality: ConnectionQuality) => {
    switch (quality) {
      case ConnectionQuality.Excellent:
      case ConnectionQuality.Good:
        return 'bg-green-500';
      case ConnectionQuality.Poor:
        return 'bg-yellow-500';
      case ConnectionQuality.Lost:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden ${isSpotlighted ? 'ring-2 ring-blue-500' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSpotlight}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
      />

      {/* No Video Placeholder */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-semibold text-white">
                {participantName.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-white/70 text-sm">{participantName}</p>
          </div>
        </div>
      )}

      {/* Overlay with participant info */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${isHovered || !isVideoEnabled ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top bar with name and connection quality */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
            <span className="text-white text-xs font-medium truncate max-w-[120px]">
              {participantName}
            </span>
            {isLocal && (
              <span className="text-xs text-blue-400">(You)</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {getQualityIcon(connectionQuality)}
          </div>
        </div>

        {/* Bottom bar with controls */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
            {isVideoEnabled ? (
              <Video className="w-4 h-4 text-green-400" />
            ) : (
              <VideoOff className="w-4 h-4 text-red-400" />
            )}
            {isAudioEnabled ? (
              <Mic className="w-4 h-4 text-green-400" />
            ) : (
              <MicOff className="w-4 h-4 text-red-400" />
            )}
          </div>
        </div>
      </div>

      {/* Connection quality indicator */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getQualityColor(connectionQuality)}`} />
    </div>
  );
}
