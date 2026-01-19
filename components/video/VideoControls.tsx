"use client";

import { useState, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Phone, Settings, Grid, User, Radio, Circle, Square } from 'lucide-react';
import { VideoQuality } from './useVideoRoom';
import VideoSettings from './VideoSettings';

type ViewMode = 'grid' | 'spotlight' | 'speaker';

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  videoQuality: VideoQuality;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'lost';
  viewMode: ViewMode;
  roomName: string;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onChangeQuality: (quality: VideoQuality) => void;
  onViewModeChange?: (mode: ViewMode) => void;
  className?: string;
}

export default function VideoControls({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  videoQuality,
  connectionQuality,
  viewMode,
  roomName,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeave,
  onChangeQuality,
  onViewModeChange,
  className = '',
}: VideoControlsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLoading, setRecordingLoading] = useState(false);

  // Check recording status on mount
  useEffect(() => {
    checkRecordingStatus();
  }, [roomName]);

  const checkRecordingStatus = async () => {
    try {
      const response = await fetch(`/api/video/recording?roomName=${roomName}`);
      if (response.ok) {
        const data = await response.json();
        setIsRecording(data.isRecording || false);
      }
    } catch (error) {
      console.error('Failed to check recording status:', error);
    }
  };

  const toggleRecording = async () => {
    setRecordingLoading(true);
    try {
      const response = await fetch('/api/video/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          action: isRecording ? 'stop' : 'start',
        }),
      });

      if (response.ok) {
        setIsRecording(!isRecording);
      } else {
        const error = await response.json();
        console.error('Failed to toggle recording:', error);
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
    } finally {
      setRecordingLoading(false);
    }
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent':
      case 'good':
        return 'text-green-400';
      case 'poor':
        return 'text-yellow-400';
      case 'lost':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <>
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-3">
          {/* Video Toggle */}
          <button
            onClick={onToggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoEnabled
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Audio Toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-3 rounded-full transition-colors ${
              isAudioEnabled
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={onToggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          {/* View Mode Toggle */}
          {onViewModeChange && (
            <button
              onClick={() => {
                const nextMode: ViewMode = viewMode === 'grid' ? 'spotlight' : 'grid';
                onViewModeChange(nextMode);
              }}
              className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              title={`Switch to ${viewMode === 'grid' ? 'spotlight' : 'grid'} view`}
            >
              {viewMode === 'grid' ? <User className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </button>
          )}

          {/* Recording Toggle */}
          <button
            onClick={toggleRecording}
            disabled={recordingLoading}
            className={`p-3 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            } disabled:opacity-50`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? (
              <Square className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5 fill-red-500" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Connection Quality Indicator */}
          <div className={`px-2 ${getConnectionQualityColor()}`}>
            <Radio className="w-4 h-4" />
          </div>

          {/* Leave Call */}
          <button
            onClick={onLeave}
            className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="Leave call"
          >
            <Phone className="w-5 h-5 rotate-[135deg]" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <VideoSettings
          videoQuality={videoQuality}
          onQualityChange={onChangeQuality}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
