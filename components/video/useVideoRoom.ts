"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Room, 
  RoomEvent, 
  RemoteParticipant, 
  LocalParticipant,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteVideoTrack,
  RemoteAudioTrack,
  Track,
  createLocalVideoTrack,
  createLocalAudioTrack,
  createLocalScreenTracks,
  ConnectionQuality,
  DisconnectReason,
} from 'livekit-client';
import { initializeUserInteraction, safePlayAudio, setInteracted } from '@/lib/audioUtils';

export type VideoQuality = 'low' | 'sd' | 'hd';

export interface ParticipantState {
  participant: RemoteParticipant | LocalParticipant;
  videoTrack: RemoteVideoTrack | LocalVideoTrack | null;
  audioTrack: RemoteAudioTrack | LocalAudioTrack | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  connectionQuality: ConnectionQuality;
}

export interface UseVideoRoomOptions {
  roomName: string;
  onLeave?: () => void;
  onParticipantsChange?: (participants: RemoteParticipant[]) => void;
  initialVideoEnabled?: boolean;
  initialAudioEnabled?: boolean;
  initialQuality?: VideoQuality;
}

export function useVideoRoom({
  roomName,
  onLeave,
  onParticipantsChange,
  initialVideoEnabled = true,
  initialAudioEnabled = true,
  initialQuality = 'hd',
}: UseVideoRoomOptions) {
  const { data: session } = useSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(new Map());
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [screenShareTrack, setScreenShareTrack] = useState<LocalVideoTrack | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled);
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>(initialQuality);
  const [error, setError] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.Excellent);

  const roomRef = useRef<Room | null>(null);
  const participantsRef = useRef<Map<string, ParticipantState>>(new Map());

  const getVideoResolution = (quality: VideoQuality) => {
    switch (quality) {
      case 'hd':
        return { width: 1280, height: 720 };
      case 'sd':
        return { width: 640, height: 480 };
      case 'low':
        return { width: 320, height: 240 };
      default:
        return { width: 640, height: 480 };
    }
  };

  const addParticipant = (participant: RemoteParticipant) => {
    console.log('[addParticipant] Adding participant:', participant.identity);
    console.log('[addParticipant] Video tracks:', participant.videoTrackPublications.size);
    console.log('[addParticipant] Audio tracks:', participant.audioTrackPublications.size);
    
    const state: ParticipantState = {
      participant,
      videoTrack: null,
      audioTrack: null,
      isVideoEnabled: false,
      isAudioEnabled: false,
      connectionQuality: ConnectionQuality.Excellent,
    };

    // Check for existing subscribed video tracks
    participant.videoTrackPublications.forEach((publication) => {
      console.log('[addParticipant] Video publication:', {
        trackSid: publication.trackSid,
        isSubscribed: publication.isSubscribed,
        hasTrack: !!publication.track,
        isMuted: publication.isMuted
      });
      if (publication.track && publication.isSubscribed) {
        state.videoTrack = publication.track as RemoteVideoTrack;
        state.isVideoEnabled = !publication.isMuted;
        console.log('[addParticipant] Set video track for:', participant.identity);
      }
    });

    // Check for existing subscribed audio tracks
    participant.audioTrackPublications.forEach((publication) => {
      console.log('[addParticipant] Audio publication:', {
        trackSid: publication.trackSid,
        isSubscribed: publication.isSubscribed,
        hasTrack: !!publication.track,
        isMuted: publication.isMuted
      });
      if (publication.track && publication.isSubscribed) {
        const track = publication.track;
        state.audioTrack = track as RemoteAudioTrack;
        state.isAudioEnabled = !publication.isMuted;
        
        // Create audio element and attach the track
        const audioElement = track.attach() as HTMLAudioElement;
        audioElement.style.display = 'none';
        audioElement.autoplay = true;
        audioElement.volume = 1;
        document.body.appendChild(audioElement);
        
        // Store reference for cleanup
        (track as any)._audioElement = audioElement;
        
        // Use safe play audio utility
        safePlayAudio(audioElement).then((success) => {
          if (success) {
            console.log('[addParticipant] Audio playing for:', participant.identity);
          } else {
            console.log('[addParticipant] Audio pending user interaction for:', participant.identity);
          }
        });
        
        console.log('[addParticipant] Set audio track for:', participant.identity);
      }
    });

    participantsRef.current.set(participant.identity, state);
    setParticipants(new Map(participantsRef.current));
  };

  const removeParticipant = (identity: string) => {
    participantsRef.current.delete(identity);
    setParticipants(new Map(participantsRef.current));
  };

  const handleTrackSubscribed = (track: Track, participant: RemoteParticipant) => {
    const state = participantsRef.current.get(participant.identity);
    if (!state) return;

    if (track.kind === 'video') {
      state.videoTrack = track as RemoteVideoTrack;
      state.isVideoEnabled = true;
    } else if (track.kind === 'audio') {
      state.audioTrack = track as RemoteAudioTrack;
      state.isAudioEnabled = true;
      
      // Create audio element and attach the track
      const audioElement = track.attach() as HTMLAudioElement;
      audioElement.style.display = 'none';
      audioElement.autoplay = true;
      audioElement.volume = 1;
      document.body.appendChild(audioElement);
      
      // Store reference for cleanup
      (track as any)._audioElement = audioElement;
      
      console.log(`[handleTrackSubscribed] Audio element created for: ${participant.identity}`);
      
      // Use safe play audio utility which handles autoplay policy
      safePlayAudio(audioElement).then((success) => {
        if (success) {
          console.log(`[handleTrackSubscribed] Audio playing for: ${participant.identity}`);
        } else {
          console.log(`[handleTrackSubscribed] Audio pending user interaction for: ${participant.identity}`);
        }
      });
    }

    participantsRef.current.set(participant.identity, state);
    setParticipants(new Map(participantsRef.current));
  };

  const handleTrackUnsubscribed = (track: Track, participant: RemoteParticipant) => {
    const state = participantsRef.current.get(participant.identity);
    if (!state) return;

    if (track.kind === 'video') {
      track.detach();
      state.videoTrack = null;
      state.isVideoEnabled = false;
    } else if (track.kind === 'audio') {
      // Clean up audio element
      if ((track as any)._audioElement) {
        const audioEl = (track as any)._audioElement as HTMLAudioElement;
        audioEl.pause();
        audioEl.srcObject = null;
        audioEl.remove();
        delete (track as any)._audioElement;
      }
      track.detach();
      state.audioTrack = null;
      state.isAudioEnabled = false;
    }

    participantsRef.current.set(participant.identity, state);
    setParticipants(new Map(participantsRef.current));
  };

  const updateParticipantTrackState = (identity: string, kind: Track.Kind, enabled: boolean) => {
    const state = participantsRef.current.get(identity);
    if (!state) return;

    if (kind === 'video') {
      state.isVideoEnabled = enabled;
    } else if (kind === 'audio') {
      state.isAudioEnabled = enabled;
    }

    participantsRef.current.set(identity, state);
    setParticipants(new Map(participantsRef.current));
  };

  const updateParticipantQuality = (identity: string, quality: ConnectionQuality) => {
    const state = participantsRef.current.get(identity);
    if (!state) return;
    state.connectionQuality = quality;
    participantsRef.current.set(identity, state);
    setParticipants(new Map(participantsRef.current));
  };

  const setupRoomEventListeners = (roomInstance: Room) => {
    // Local track published
    roomInstance.on(RoomEvent.LocalTrackPublished, (publication) => {
      console.log('Local track published:', publication.kind, publication.trackSid);
    });

    // Local track unpublished
    roomInstance.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      console.log('Local track unpublished:', publication.kind, publication.trackSid);
    });

    // Participant connected
    roomInstance.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      addParticipant(participant);
    });

    // Participant disconnected
    roomInstance.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      removeParticipant(participant.identity);
    });

    // Track subscribed
    roomInstance.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('[TrackSubscribed] Track subscribed:', {
        kind: track.kind,
        participant: participant.identity,
        trackSid: track.sid,
        source: track.source,
        publicationTrackSid: publication.trackSid,
        isMuted: publication.isMuted,
      });
      if (participant instanceof RemoteParticipant) {
        handleTrackSubscribed(track, participant);
      }
    });

    // Track unsubscribed
    roomInstance.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log('Track unsubscribed:', track.kind, participant.identity);
      if (participant instanceof RemoteParticipant) {
        handleTrackUnsubscribed(track, participant);
      }
    });

    // Track muted/unmuted
    roomInstance.on(RoomEvent.TrackMuted, (publication, participant) => {
      if (participant instanceof RemoteParticipant) {
        updateParticipantTrackState(participant.identity, publication.kind, false);
      }
    });

    roomInstance.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      if (participant instanceof RemoteParticipant) {
        updateParticipantTrackState(participant.identity, publication.kind, true);
      }
    });

    // Connection quality changed
    roomInstance.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant instanceof LocalParticipant) {
        setConnectionQuality(quality);
      } else if (participant instanceof RemoteParticipant) {
        updateParticipantQuality(participant.identity, quality);
      }
    });

    // Disconnected
    roomInstance.on(RoomEvent.Disconnected, (reason) => {
      console.log('Disconnected from room, reason:', reason);
      setIsConnected(false);
      // Only call onLeave if it was a client-requested disconnect (user clicked leave)
      // Don't auto-leave on connection errors - let user see the error and decide
      if (reason === DisconnectReason.CLIENT_INITIATED && onLeave) {
        onLeave();
      } else if (reason) {
        // For other disconnect reasons (errors, server disconnect, etc.), show error
        setError(`Connection lost: ${reason}. Please try again.`);
      }
    });
  };

  const enableLocalVideo = async () => {
    try {
      if (!roomRef.current) {
        setError('Room not connected. Please try again.');
        return;
      }

      console.log('[enableLocalVideo] Creating local video track with quality:', videoQuality);
      const track = await createLocalVideoTrack({
        resolution: getVideoResolution(videoQuality),
        facingMode: 'user',
      });
      console.log('[enableLocalVideo] Local video track created:', track.sid);

      console.log('[enableLocalVideo] Publishing video track...');
      const publication = await roomRef.current.localParticipant.publishTrack(track);
      console.log('[enableLocalVideo] Video track published:', publication.trackSid);
      
      setLocalVideoTrack(track);
      setIsVideoEnabled(true);
      setError(null); // Clear any previous errors
    } catch (error: any) {
      console.error('Failed to enable video:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setError('Camera is being used by another application. Please close it and try again.');
      } else {
        setError(`Failed to access camera: ${error.message || 'Unknown error'}`);
      }
      setIsVideoEnabled(false);
    }
  };

  const disableLocalVideo = async () => {
    if (!roomRef.current || !localVideoTrack) return;

    roomRef.current.localParticipant.unpublishTrack(localVideoTrack);
    localVideoTrack.stop();
    setLocalVideoTrack(null);
    setIsVideoEnabled(false);
  };

  const enableLocalAudio = async () => {
    try {
      if (!roomRef.current) {
        setError('Room not connected. Please try again.');
        return;
      }

      console.log('[enableLocalAudio] Creating local audio track...');
      const track = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      console.log('[enableLocalAudio] Local audio track created:', track.sid);

      console.log('[enableLocalAudio] Publishing audio track...');
      const publication = await roomRef.current.localParticipant.publishTrack(track);
      console.log('[enableLocalAudio] Audio track published:', publication.trackSid);
      
      setLocalAudioTrack(track);
      setIsAudioEnabled(true);
      setError(null); // Clear any previous errors
    } catch (error: any) {
      console.error('Failed to enable audio:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setError('Microphone is being used by another application. Please close it and try again.');
      } else {
        setError(`Failed to access microphone: ${error.message || 'Unknown error'}`);
      }
      setIsAudioEnabled(false);
    }
  };

  const disableLocalAudio = async () => {
    if (!roomRef.current || !localAudioTrack) return;

    roomRef.current.localParticipant.unpublishTrack(localAudioTrack);
    localAudioTrack.stop();
    setLocalAudioTrack(null);
    setIsAudioEnabled(false);
  };

  const startScreenShare = async () => {
    try {
      if (!roomRef.current) {
        setError('Room not connected. Please try again.');
        return;
      }

      const tracks = await createLocalScreenTracks({
        resolution: getVideoResolution(videoQuality),
      });

      if (tracks && tracks.length > 0) {
        const screenTrack = tracks[0] as LocalVideoTrack;
        await roomRef.current.localParticipant.publishTrack(screenTrack, {
          source: Track.Source.ScreenShare,
        });
        setScreenShareTrack(screenTrack);
        setIsScreenSharing(true);
        setError(null); // Clear any previous errors
      }
    } catch (error: any) {
      console.error('Failed to start screen share:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Screen sharing permission denied. Please allow screen sharing in your browser.');
      } else if (error.name === 'NotSupportedError') {
        setError('Screen sharing is not supported in your browser. Please use a modern browser.');
      } else {
        setError(`Failed to start screen sharing: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const stopScreenShare = async () => {
    if (!roomRef.current || !screenShareTrack) return;

    roomRef.current.localParticipant.unpublishTrack(screenShareTrack);
    screenShareTrack.stop();
    setScreenShareTrack(null);
    setIsScreenSharing(false);
  };

  const connectToRoom = async () => {
    try {
      setError(null);
      console.log('[useVideoRoom] Starting connection to room:', roomName);
      
      // Mark user as having interacted (they clicked to join)
      setInteracted();
      initializeUserInteraction();
      
      // Get LiveKit token
      console.log('[useVideoRoom] Fetching token from API...');
      const tokenResponse = await fetch(`/api/video/token?roomName=${roomName}`);
      console.log('[useVideoRoom] Token response status:', tokenResponse.status);
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({ error: tokenResponse.statusText }));
        console.error('[useVideoRoom] Token request failed:', errorData);
        if (tokenResponse.status === 401) {
          throw new Error('Please sign in to join video calls');
        } else if (tokenResponse.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (tokenResponse.status === 500 && errorData.error?.includes('LiveKit')) {
          throw new Error('LiveKit is not configured. Please contact the administrator.');
        } else {
          throw new Error(errorData.error || `Failed to get token: ${tokenResponse.status}`);
        }
      }

      const { token, url } = await tokenResponse.json();
      console.log('[useVideoRoom] Got token, URL:', url ? 'configured' : 'missing');
      
      if (!token || !url) {
        throw new Error('Invalid token response. LiveKit may not be configured properly.');
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
      setupRoomEventListeners(roomInstance);

      // Connect to room with timeout
      console.log('[useVideoRoom] Connecting to LiveKit room at:', url);
      const connectPromise = roomInstance.connect(url, token);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds. Please check your internet connection and LiveKit server.')), 10000);
      });
      
      try {
        await Promise.race([connectPromise, timeoutPromise]);
        console.log('[useVideoRoom] Connection successful');
      } catch (connectError: any) {
        console.error('[useVideoRoom] Connection failed:', connectError);
        // Clean up the room instance
        try {
          await roomInstance.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
        throw connectError;
      }
      
      setRoom(roomInstance);
      roomRef.current = roomInstance;
      setIsConnected(true);
      console.log('[useVideoRoom] Successfully connected to LiveKit room');

      // Add existing participants that are already in the room
      roomInstance.remoteParticipants.forEach((participant) => {
        console.log('[useVideoRoom] Adding existing participant:', participant.identity);
        addParticipant(participant);
      });

      // Enable local video and audio if requested
      // Wait a bit for connection to stabilize
      setTimeout(async () => {
        if (initialVideoEnabled && roomRef.current) {
          await enableLocalVideo();
        }
        if (initialAudioEnabled && roomRef.current) {
          await enableLocalAudio();
        }
      }, 500);

    } catch (error: any) {
      console.error('Failed to connect to room:', error);
      let errorMessage = 'Failed to connect to room.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'NetworkError' || error.name === 'TypeError') {
        errorMessage = 'Network error. Please check your internet connection and LiveKit server URL.';
      } else if (error.message?.includes('LiveKit') || error.message?.includes('configured')) {
        errorMessage = error.message;
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet connection and LiveKit server.';
      }
      
      setError(errorMessage);
      setIsConnected(false);
      // Don't call onLeave automatically - let user decide
    }
  };

  const toggleVideo = async () => {
    if (isVideoEnabled) {
      await disableLocalVideo();
    } else {
      await enableLocalVideo();
    }
  };

  const toggleAudio = async () => {
    if (isAudioEnabled) {
      await disableLocalAudio();
    } else {
      await enableLocalAudio();
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const changeVideoQuality = async (quality: VideoQuality) => {
    setVideoQuality(quality);
    // If video is enabled, restart with new quality
    if (isVideoEnabled && localVideoTrack) {
      await disableLocalVideo();
      await enableLocalVideo();
    }
  };

  const leaveRoom = async () => {
    try {
      if (localVideoTrack) {
        localVideoTrack.stop();
      }
      if (localAudioTrack) {
        localAudioTrack.stop();
      }
      if (screenShareTrack) {
        screenShareTrack.stop();
      }
      if (roomRef.current) {
        // Disconnect with CLIENT_REQUESTED reason so the event handler knows it's intentional
        await roomRef.current.disconnect();
      }
    } catch (error) {
      console.error('Error during leaveRoom cleanup:', error);
    } finally {
      // Always call onLeave after cleanup
      if (onLeave) {
        onLeave();
      }
    }
  };

  // Initialize room connection
  useEffect(() => {
    if (!roomName) return;
    
    console.log('useVideoRoom: Connecting to room:', roomName);
    connectToRoom();
    
    return () => {
      console.log('useVideoRoom: Cleaning up room connection');
      if (localVideoTrack) {
        localVideoTrack.stop();
      }
      if (localAudioTrack) {
        localAudioTrack.stop();
      }
      if (screenShareTrack) {
        screenShareTrack.stop();
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]);

  // Notify parent of participant changes
  useEffect(() => {
    if (onParticipantsChange) {
      const remoteParticipants = Array.from(participants.values())
        .filter(p => p.participant instanceof RemoteParticipant)
        .map(p => p.participant as RemoteParticipant);
      onParticipantsChange(remoteParticipants);
    }
  }, [participants, onParticipantsChange]);

  return {
    room,
    isConnected,
    participants: Array.from(participants.values()),
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
  };
}
