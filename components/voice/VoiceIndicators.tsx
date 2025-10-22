"use client";
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface VoiceIndicatorsProps {
  groupId: string;
  onSpeakingChange: (userId: string, isSpeaking: boolean, volume?: number) => void;
}

interface SpeakingState {
  [userId: string]: {
    isSpeaking: boolean;
    volume: number;
  };
}

export default function VoiceIndicators({ groupId, onSpeakingChange }: VoiceIndicatorsProps) {
  const { data: session } = useSession();
  const [speakingStates, setSpeakingStates] = useState<SpeakingState>({});
  const [isConnected, setIsConnected] = useState(false);
  const roomRef = useRef<any>(null);
  const participantsRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    initializeLiveKit();
    return () => {
      cleanup();
    };
  }, [groupId]);

  const initializeLiveKit = async () => {
    try {
      // For now, we'll simulate voice indicators
      // In a real implementation, you would:
      // 1. Get LiveKit token from the API
      // 2. Connect to the LiveKit room
      // 3. Listen for participant events
      
      setIsConnected(true);
      
      // Simulate speaking detection for demo purposes
      simulateSpeakingDetection();
      
    } catch (error) {
      console.error('Failed to initialize LiveKit:', error);
      setIsConnected(false);
    }
  };

  const simulateSpeakingDetection = () => {
    // This is a simulation for demo purposes
    // In real implementation, this would be handled by LiveKit events
    
    const simulateRandomSpeaking = () => {
      const userIds = Object.keys(speakingStates);
      if (userIds.length > 0) {
        const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
        const isSpeaking = Math.random() > 0.7; // 30% chance of speaking
        
        const volume = Math.random(); // Simulate volume for demo
        setSpeakingStates(prev => ({
          ...prev,
          [randomUserId]: { isSpeaking, volume }
        }));
        
        onSpeakingChange(randomUserId, isSpeaking, volume);
      }
    };

    // Simulate speaking every 2-5 seconds
    const interval = setInterval(simulateRandomSpeaking, Math.random() * 3000 + 2000);
    
    return () => clearInterval(interval);
  };

  const cleanup = async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch (error) {
        console.error('Error disconnecting from room:', error);
      }
    }
    setIsConnected(false);
  };

  const updateParticipantSpeaking = (participantId: string, isSpeaking: boolean, volume: number = 0) => {
    setSpeakingStates(prev => ({
      ...prev,
      [participantId]: { isSpeaking, volume }
    }));
    
    onSpeakingChange(participantId, isSpeaking, volume);
  };

  // Real LiveKit implementation would look like this:
  /*
  const initializeLiveKit = async () => {
    try {
      // Get token from API
      const tokenResponse = await fetch(`/api/voice/token?groupId=${groupId}`);
      const { token } = await tokenResponse.json();
      
      // Create room
      const room = new Room();
      roomRef.current = room;
      
      // Set up event listeners
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        participantsRef.current.set(participant.identity, participant);
        
        participant.on(ParticipantEvent.IsSpeakingChanged, (isSpeaking) => {
          updateParticipantSpeaking(participant.identity, isSpeaking);
        });
      });
      
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        participantsRef.current.delete(participant.identity);
        setSpeakingStates(prev => {
          const newState = { ...prev };
          delete newState[participant.identity];
          return newState;
        });
      });
      
      // Connect to room
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
      setIsConnected(true);
      
    } catch (error) {
      console.error('Failed to initialize LiveKit:', error);
      setIsConnected(false);
    }
  };
  */

  return {
    isConnected,
    speakingStates,
    updateParticipantSpeaking,
  };
}

// Hook for easy usage
export function useVoiceIndicators(groupId: string) {
  const [speakingStates, setSpeakingStates] = useState<SpeakingState>({});
  const [isConnected, setIsConnected] = useState(false);

  const handleSpeakingChange = (userId: string, isSpeaking: boolean, volume: number = 0) => {
    setSpeakingStates(prev => ({
      ...prev,
      [userId]: { isSpeaking, volume }
    }));
  };

  const isUserSpeaking = (userId: string) => {
    return speakingStates[userId]?.isSpeaking || false;
  };

  const getUserVolume = (userId: string) => {
    return speakingStates[userId]?.volume || 0;
  };

  return {
    isConnected,
    speakingStates,
    isUserSpeaking,
    getUserVolume,
    handleSpeakingChange,
  };
}
