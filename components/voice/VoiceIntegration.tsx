"use client";
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Mic, MicOff, PhoneOff, AlertCircle, LogOut } from 'lucide-react';
import { useNotifications } from '../ui/NotificationSystem';

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
  const [currentVolume, setCurrentVolume] = useState(0);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { showNotification } = useNotifications();

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      mediaStreamRef.current = stream;
      setPermissionGranted(true);

      // Set up audio analysis for speaking detection
      setupAudioAnalysis(stream);

      showNotification({
        title: 'Microphone Access Granted',
        message: 'You can now use voice chat. Click the microphone button to unmute.',
        type: 'success',
        duration: 4000,
      });

      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setPermissionGranted(false);
      setError('Microphone access is required for voice chat');

      showNotification({
        title: 'Microphone Access Denied',
        message: 'Please allow microphone access to use voice chat features.',
        type: 'error',
        duration: 6000,
      });

      return false;
    }
  };

  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start speaking detection
      detectSpeaking();
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
    }
  };

  const detectSpeaking = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkSpeaking = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const threshold = 10; // Lowered threshold for better sensitivity

      // Normalize volume to 0-1 range for the audible alert (more sensitive)
      const normalizedVolume = Math.min(average / 50, 1); // Cap at 50 for more sensitive normalization
      setCurrentVolume(normalizedVolume);

      const wasSpeaking = isSpeaking;
      const nowSpeaking = average > threshold && !isMuted;

      if (nowSpeaking !== wasSpeaking) {
        setIsSpeaking(nowSpeaking);
        onSpeakingChange?.(nowSpeaking);
        // Also notify about user speaking state with volume
        if (session?.user?.id) {
          onUserSpeakingChange?.(session.user.id, nowSpeaking, normalizedVolume);
        }
      } else if (nowSpeaking && session?.user?.id) {
        // Update volume even if speaking state hasn't changed
        onUserSpeakingChange?.(session.user.id, nowSpeaking, normalizedVolume);
      }

      animationFrameRef.current = requestAnimationFrame(checkSpeaking);
    };

    checkSpeaking();
  };

  const connectToVoice = async () => {
    if (!session?.user?.id) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Request microphone permission first
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setIsConnecting(false);
        return;
      }

      // Get LiveKit token
      const tokenResponse = await fetch(`/api/voice/token?groupId=${groupId}`);
      if (!tokenResponse.ok) {
        throw new Error('Failed to get voice token');
      }

      const { token } = await tokenResponse.json();

      // For now, we'll simulate connection since we don't have LiveKit server set up
      // In a real implementation, you would connect to LiveKit here

      setIsConnected(true);
      setIsConnecting(false);
      onConnectionChange?.(true);

      showNotification({
        title: 'Connected to Voice Chat',
        message: 'You are now connected to the voice channel.',
        type: 'success',
        duration: 3000,
      });

    } catch (error) {
      console.error('Error connecting to voice:', error);
      setError('Failed to connect to voice chat');
      setIsConnecting(false);

      showNotification({
        title: 'Connection Failed',
        message: 'Failed to connect to voice chat. Please try again.',
        type: 'error',
        duration: 4000,
      });
    }
  };

  const disconnectFromVoice = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsConnected(false);
    setIsMuted(true);
    setIsSpeaking(false);
    setPermissionGranted(null);
    setError(null);
    onConnectionChange?.(false);

    showNotification({
      title: 'Disconnected from Voice Chat',
      message: 'You have left the voice channel.',
      type: 'info',
      duration: 3000,
    });
  };

  const toggleMute = () => {
    if (!mediaStreamRef.current) return;

    const audioTracks = mediaStreamRef.current.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = isMuted;
    });

    setIsMuted(!isMuted);
    setIsSpeaking(false);
    onSpeakingChange?.(false);
  };

  const togglePushToTalk = () => {
    setPushToTalk(!pushToTalk);
    if (!pushToTalk) {
      setIsMuted(true);
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    }
  };

  const handlePushToTalkStart = () => {
    if (pushToTalk && mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = true;
      });
      setIsPushToTalkActive(true);
      setIsMuted(false);
      onPushToTalkChange?.(true);
    }
  };

  const handlePushToTalkEnd = () => {
    if (pushToTalk && mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = false;
      });
      setIsPushToTalkActive(false);
      setIsMuted(true);
      setIsSpeaking(false);
      onSpeakingChange?.(false);
      onPushToTalkChange?.(false);
    }
  };

  // Keyboard event handlers for push-to-talk
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && pushToTalk && !isPushToTalkActive) {
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
    if (session?.user?.id && !isConnected && !isConnecting) {
      connectToVoice();
    }
  }, [session?.user?.id]);

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-400">Voice Chat Error</p>
          <p className="text-xs text-red-300">{error}</p>
        </div>
        <button
          onClick={connectToVoice}
          className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
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
        <button
          onClick={connectToVoice}
          className="px-3 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
        >
          Connect
        </button>
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
        title={pushToTalk ? 'Disable Push-to-Talk' : 'Enable Push-to-Talk'}
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
          onClick={onLeaveGroup}
          className="p-3 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          title="Leave Group"
        >
          <LogOut className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
