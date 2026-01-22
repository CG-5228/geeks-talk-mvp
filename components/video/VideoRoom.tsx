"use client";

import { useEffect, useRef, useState } from 'react';
import { LocalParticipant, ConnectionQuality } from 'livekit-client';
import { useVideoRoom, ParticipantState, VideoQuality } from './useVideoRoom';
import VideoGrid from './VideoGrid';
import VideoControls from './VideoControls';
import VideoChatSidebar from './VideoChatSidebar';

type ViewMode = 'grid' | 'spotlight' | 'speaker';

interface VideoRoomProps {
  roomName: string;
  onLeave: () => void;
  showSidebar?: boolean;
}

export default function VideoRoom({ roomName, onLeave, showSidebar = true }: VideoRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSidebarState, setShowSidebarState] = useState(showSidebar);

  useEffect(() => {
    console.log('VideoRoom mounted with roomName:', roomName);
    return () => {
      console.log('VideoRoom unmounting');
    };
  }, [roomName]);

  const {
    room,
    isConnected,
    participants,
    localVideoTrack,
    localAudioTrack,
    screenShareTrack,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    videoQuality,
    connectionQuality,
    error,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    changeVideoQuality,
    leaveRoom,
  } = useVideoRoom({
    roomName,
    onLeave,
    initialVideoEnabled: true,
    initialAudioEnabled: true,
    initialQuality: 'hd',
  });

  // Attach local video track to video element
  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      localVideoTrack.attach(localVideoRef.current);
      return () => {
        localVideoTrack.detach();
      };
    }
  }, [localVideoTrack]);

  // Create local participant state
  const localParticipantState: ParticipantState | null = room && isConnected
    ? {
        participant: room.localParticipant,
        videoTrack: localVideoTrack,
        audioTrack: localAudioTrack,
        isVideoEnabled,
        isAudioEnabled,
        connectionQuality,
      }
    : null;

  // Convert connection quality to string for controls
  const connectionQualityString = 
    connectionQuality === ConnectionQuality.Excellent ? 'excellent' :
    connectionQuality === ConnectionQuality.Good ? 'good' :
    connectionQuality === ConnectionQuality.Poor ? 'poor' : 'lost';

  if (error) {
    console.error('VideoRoom error:', error);
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-black">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-400 text-lg font-semibold mb-2">Connection Error</div>
          <div className="text-white/70 mb-4 break-words">{error}</div>
          <div className="text-white/50 text-sm mb-6">
            {error.includes('LiveKit') || error.includes('configured') ? (
              <div className="space-y-2">
                <p>Please ensure LiveKit is properly configured:</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li>LIVEKIT_URL is set in environment variables</li>
                  <li>LIVEKIT_API_KEY is set</li>
                  <li>LIVEKIT_SECRET is set</li>
                  <li>LiveKit server is running and accessible</li>
                </ul>
              </div>
            ) : null}
          </div>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => {
                // Retry by reloading the page
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white/70">Connecting to room...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-black">
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col ${showSidebarState ? '' : ''}`}>
        {/* Video Grid */}
        <div className="flex-1 relative min-h-0">
          <VideoGrid
            participants={participants}
            localParticipant={localParticipantState}
            screenShareTrack={screenShareTrack}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            className="h-full"
          />
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <VideoControls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isScreenSharing={isScreenSharing}
            videoQuality={videoQuality}
            connectionQuality={connectionQualityString as any}
            viewMode={viewMode}
            roomName={roomName}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onToggleScreenShare={toggleScreenShare}
            onLeave={leaveRoom}
            onChangeQuality={changeVideoQuality}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      {/* Sidebar */}
      {showSidebarState && (
        <VideoChatSidebar
          participants={participants}
          localParticipant={localParticipantState}
          roomName={roomName}
          className="w-80"
        />
      )}

      {/* Hidden local video element for processing */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />
    </div>
  );
}
