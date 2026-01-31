"use client";
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Mic, MicOff, PhoneOff, AlertCircle, LogOut } from 'lucide-react';
import { useNotifications } from '../ui/NotificationSystem';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  LocalTrack,
  Track,
  LocalAudioTrack,
} from 'livekit-client';
import { safePlayAudio, initializeUserInteraction, setInteracted } from '@/lib/audioUtils';

interface VoiceIntegrationProps {
  groupId: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onUserSpeakingChange?: (userId: string, isSpeaking: boolean, volume?: number) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onPushToTalkChange?: (isActive: boolean) => void;
  onLeaveGroup?: () => void;
}

export default function VoiceIntegration({ groupId, onSpeakingChange, onUserSpeakingChange, onConnectionChange, onPushToTalkChange, onLeaveGroup }: VoiceIntegrationProps) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const { showNotification } = useNotifications();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRoom();
    };
  }, []);

  const cleanupRoom = async () => {
    // Stop local audio track
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
    }

    // Clean up audio elements
    audioElementsRef.current.forEach((element, participantId) => {
      element.pause();
      element.srcObject = null;
      element.remove();
    });
    audioElementsRef.current.clear();

    // Disconnect from room
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
  };

  const handleTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    console.log('[VoiceIntegration] Track subscribed:', {
      kind: track.kind,
      participantId: participant.identity,
      trackSid: track.sid,
    });

    if (track.kind === 'audio') {
      // Create audio element for remote participant
      const audioElement = track.attach() as HTMLAudioElement;
      audioElement.style.display = 'none';
      audioElement.autoplay = true;
      audioElement.volume = 1;
      document.body.appendChild(audioElement);

      // Store reference
      audioElementsRef.current.set(participant.identity, audioElement);

      // Try to play
      safePlayAudio(audioElement).then((success) => {
        console.log('[VoiceIntegration] Audio play result for', participant.identity, ':', success);
      });

      // Notify about user speaking (basic detection)
      onUserSpeakingChange?.(participant.identity, true, 0.5);
    }
  };

  const handleTrackUnsubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    console.log('[VoiceIntegration] Track unsubscribed:', {
      kind: track.kind,
      participantId: participant.identity,
    });

    if (track.kind === 'audio') {
      // Clean up audio element
      const audioElement = audioElementsRef.current.get(participant.identity);
      if (audioElement) {
        audioElement.pause();
        audioElement.srcObject = null;
        audioElement.remove();
        audioElementsRef.current.delete(participant.identity);
      }

      // Track is detached
      track.detach();

      onUserSpeakingChange?.(participant.identity, false, 0);
    }
  };

  const handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log('[VoiceIntegration] Participant connected:', participant.identity);

    // Check for existing audio tracks
    participant.audioTrackPublications.forEach((publication) => {
      if (publication.isSubscribed && publication.track) {
        handleTrackSubscribed(publication.track as RemoteTrack, publication, participant);
      }
    });
  };

  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('[VoiceIntegration] Participant disconnected:', participant.identity);

    // Clean up their audio
    const audioElement = audioElementsRef.current.get(participant.identity);
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      audioElement.remove();
      audioElementsRef.current.delete(participant.identity);
    }

    onUserSpeakingChange?.(participant.identity, false, 0);
  };

  const handleActiveSpeakersChanged = (speakers: any[]) => {
    // Update speaking states for all participants
    speakers.forEach((speaker) => {
      const isSelf = speaker.identity === session?.user?.id;
      if (isSelf) {
        const nowSpeaking = speaker.audioLevel > 0.01;
        if (nowSpeaking !== isSpeaking) {
          setIsSpeaking(nowSpeaking);
          onSpeakingChange?.(nowSpeaking);
        }
      }
      onUserSpeakingChange?.(speaker.identity, speaker.audioLevel > 0.01, speaker.audioLevel);
    });
  };

  const connectToVoice = async () => {
    if (!session?.user?.id || isExiting) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Mark user interaction for autoplay
      setInteracted();
      initializeUserInteraction();

      // Get LiveKit token
      const tokenResponse = await fetch(`/api/voice/token?groupId=${groupId}`);
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to get voice token');
      }

      const { token, url, roomName } = await tokenResponse.json();
      console.log('[VoiceIntegration] Got token for room:', roomName);

      if (!url) {
        throw new Error('LiveKit URL not configured');
      }

      // Create room instance
      const roomInstance = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          audioPreset: {
            maxBitrate: 32000,
            priority: 'high',
          },
        },
      });

      // Set up event listeners
      roomInstance.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      roomInstance.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      roomInstance.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
      roomInstance.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      roomInstance.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
      roomInstance.on(RoomEvent.Disconnected, () => {
        console.log('[VoiceIntegration] Disconnected from room');
        setIsConnected(false);
        onConnectionChange?.(false);
      });

      // Connect to room
      console.log('[VoiceIntegration] Connecting to LiveKit room...');
      await roomInstance.connect(url, token);
      console.log('[VoiceIntegration] Connected to room!');

      roomRef.current = roomInstance;
      setIsConnected(true);
      setIsConnecting(false);
      onConnectionChange?.(true);

      // Handle existing participants
      roomInstance.remoteParticipants.forEach((participant) => {
        handleParticipantConnected(participant);
      });

      showNotification({
        title: 'Connected to Voice Chat',
        message: 'You are now connected. Click unmute to speak.',
        type: 'success',
        duration: 3000,
      });

    } catch (error: any) {
      console.error('[VoiceIntegration] Error connecting:', error);
      setError(error.message || 'Failed to connect to voice chat');
      setIsConnecting(false);

      showNotification({
        title: 'Connection Failed',
        message: error.message || 'Failed to connect to voice chat. Please try again.',
        type: 'error',
        duration: 4000,
      });
    }
  };

  const disconnectFromVoice = async () => {
    await cleanupRoom();
    setIsConnected(false);
    setIsMuted(true);
    setIsSpeaking(false);
    setError(null);
    onConnectionChange?.(false);

    showNotification({
      title: 'Disconnected from Voice Chat',
      message: 'You have left the voice channel.',
      type: 'info',
      duration: 3000,
    });
  };

  const toggleMute = async () => {
    if (!roomRef.current) return;

    try {
      if (isMuted) {
        // Unmute - enable microphone
        const publication = await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        if (publication && publication.track) {
          localAudioTrackRef.current = publication.track as LocalAudioTrack;
        }
        setIsMuted(false);
        console.log('[VoiceIntegration] Microphone enabled');
      } else {
        // Mute - disable microphone
        await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        localAudioTrackRef.current = null;
        setIsMuted(true);
        setIsSpeaking(false);
        onSpeakingChange?.(false);
        console.log('[VoiceIntegration] Microphone disabled');
      }
    } catch (error) {
      console.error('[VoiceIntegration] Error toggling mute:', error);
      showNotification({
        title: 'Microphone Error',
        message: 'Failed to toggle microphone. Please check permissions.',
        type: 'error',
        duration: 4000,
      });
    }
  };

  const togglePushToTalk = () => {
    setPushToTalk(!pushToTalk);
    if (!pushToTalk) {
      setIsMuted(true);
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    }
  };

  const handlePushToTalkStart = async () => {
    if (pushToTalk && roomRef.current && isMuted) {
      try {
        const publication = await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        if (publication && publication.track) {
          localAudioTrackRef.current = publication.track as LocalAudioTrack;
        }
        setIsPushToTalkActive(true);
        setIsMuted(false);
        onPushToTalkChange?.(true);
      } catch (error) {
        console.error('[VoiceIntegration] Push-to-talk start error:', error);
      }
    }
  };

  const handlePushToTalkEnd = async () => {
    if (pushToTalk && roomRef.current && !isMuted) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(false);
        localAudioTrackRef.current = null;
        setIsPushToTalkActive(false);
        setIsMuted(true);
        setIsSpeaking(false);
        onSpeakingChange?.(false);
        onPushToTalkChange?.(false);
      } catch (error) {
        console.error('[VoiceIntegration] Push-to-talk end error:', error);
      }
    }
  };

  // Keyboard event handlers for push-to-talk
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && pushToTalk && !isPushToTalkActive && isConnected) {
        event.preventDefault();
        handlePushToTalkStart();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && pushToTalk && isPushToTalkActive) {
        event.preventDefault();
        handlePushToTalkEnd();
      }
    };

    if (pushToTalk && isConnected) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [pushToTalk, isPushToTalkActive, isConnected]);

  // Auto-connect when component mounts
  useEffect(() => {
    if (session?.user?.id && !isConnected && !isConnecting && !isExiting) {
      connectToVoice();
    }
  }, [session?.user?.id, isExiting]);

  // Cleanup when exiting
  useEffect(() => {
    if (isExiting) {
      cleanupRoom();
      setIsConnected(false);
      setIsConnecting(false);
      setError(null);
    }
  }, [isExiting]);

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-400">Voice Chat Error</p>
          <p className="text-xs text-red-300">{error}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={connectToVoice}
            className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
          {onLeaveGroup && (
            <button
              onClick={() => {
                setIsExiting(true);
                onLeaveGroup();
              }}
              className="px-3 py-1 text-xs bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 transition-colors"
            >
              Exit Room
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
        <p className="text-sm text-blue-400">Connecting to voice chat...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
        <Mic className="w-5 h-5 text-gray-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400">Voice Chat Disconnected</p>
          <p className="text-xs text-gray-300">Click to connect and start talking</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={connectToVoice}
            className="px-3 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
          >
            Connect
          </button>
          {onLeaveGroup && (
            <button
              onClick={() => {
                setIsExiting(true);
                onLeaveGroup();
              }}
              className="px-3 py-1 text-xs bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 transition-colors"
            >
              Exit Room
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Microphone Button */}
      <button
        onClick={toggleMute}
        disabled={pushToTalk}
        className={`p-3 rounded-full transition-colors ${
          isMuted
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-green-500 text-white hover:bg-green-600'
        } ${pushToTalk ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Push-to-Talk Button */}
      <button
        onClick={togglePushToTalk}
        className={`p-3 rounded-full transition-colors ${
          pushToTalk
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-500 text-white hover:bg-gray-600'
        }`}
        title={pushToTalk ? 'Disable Push-to-Talk' : 'Enable Push-to-Talk (Hold Space)'}
      >
        <Mic className="w-5 h-5" />
      </button>

      {/* Disconnect Button */}
      <button
        onClick={disconnectFromVoice}
        className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
        title="Disconnect Voice"
      >
        <PhoneOff className="w-5 h-5" />
      </button>

      {/* Leave Group Button */}
      {onLeaveGroup && (
        <button
          onClick={() => {
            setIsExiting(true);
            disconnectFromVoice().then(() => onLeaveGroup());
          }}
          className="p-3 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          title="Leave Group"
        >
          <LogOut className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
