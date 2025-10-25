"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  LogOut, 
  Shield, 
  ShieldOff, 
  Users,
  Lock,
  Unlock,
  AlertCircle,
  Activity
} from 'lucide-react';
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, ExternalE2EEKeyProvider } from 'livekit-client';
import { 
  generateX25519Keypair, 
  deriveSharedSecret, 
  hkdf, 
  arrayBufferToBase64, 
  base64ToArrayBuffer,
  setupSFrameEncryption,
  rekeySession,
  getE2EESupportInfo,
  clearSensitiveData
} from '@/lib/e2ee';
import { useStyledDialog } from '../ui/StyledDialog';

interface OneOnOneRoomProps {
  roomName: string;
  peerId: string;
  peerTopics: string[];
  onLeave: () => void;
}

type E2EEStatus = 'initializing' | 'exchanging' | 'ready' | 'error' | 'unsupported';

// Audio Waveform Component
const AudioWaveform = ({ level, isActive }: { level: number; isActive: boolean }) => {
  const bars = Array.from({ length: 5 }, (_, i) => {
    const height = isActive ? Math.max(2, (level * 20) * (0.5 + Math.random() * 0.5)) : 2;
    return (
      <div
        key={i}
        className="bg-green-400 rounded-sm transition-all duration-75"
        style={{
          width: '2px',
          height: `${height}px`,
          opacity: isActive ? 0.8 : 0.3
        }}
      />
    );
  });

  return (
    <div className="flex items-center gap-1 h-4">
      {bars}
    </div>
  );
};

export default function OneOnOneRoom({ roomName, peerId, peerTopics, onLeave }: OneOnOneRoomProps) {
  const { data: session } = useSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isVolumeEnabled, setIsVolumeEnabled] = useState(true);
  const [e2eeStatus, setE2eeStatus] = useState<E2EEStatus>('initializing');
  const [peerParticipant, setPeerParticipant] = useState<RemoteParticipant | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [keyExchangeTimeout, setKeyExchangeTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Debug logging
  console.log('OneOnOneRoom props:', { roomName, peerId, peerTopics, myUserId: session?.user?.id });
  console.log('Expected peer ID:', peerId, 'My user ID:', session?.user?.id);
  
  // E2EE state
  const [myKeypair, setMyKeypair] = useState<{ publicKey: Uint8Array; privateKey: CryptoKey } | null>(null);
  const [peerPublicKey, setPeerPublicKey] = useState<Uint8Array | null>(null);
  const [keyIndex, setKeyIndex] = useState(0);
  const [e2eeKeyProvider, setE2eeKeyProvider] = useState<ExternalE2EEKeyProvider | null>(null);
  const [rekeyTimer, setRekeyTimer] = useState<NodeJS.Timeout | null>(null);
  const [sentMyPublicKey, setSentMyPublicKey] = useState(false);
  const [peerMicEnabled, setPeerMicEnabled] = useState(false);
  const [peerAudioLevel, setPeerAudioLevel] = useState(0);
  const [myAudioLevel, setMyAudioLevel] = useState(0);
  
  const { showDialog, DialogComponent } = useStyledDialog();
  const roomRef = useRef<Room | null>(null);

  // Initialize room connection
  useEffect(() => {
    initializeRoom();
    return () => {
      cleanup();
    };
  }, []);

  // Rekey timer
  useEffect(() => {
    if (e2eeStatus === 'ready') {
      const timer = setTimeout(() => {
        handleRekey();
      }, 10 * 60 * 1000); // 10 minutes

      setRekeyTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [e2eeStatus, keyIndex]);

  const initializeRoom = async () => {
    try {
      // Check if we're in a secure context
      if (!window.isSecureContext) {
        console.error('Not in secure context - E2EE requires HTTPS or localhost');
        setE2eeStatus('error');
        showDialog({
          title: 'Security Error',
          message: 'End-to-end encryption requires a secure connection (HTTPS or localhost).',
          type: 'error'
        });
        return;
      }

      // Check E2EE support
      const supportInfo = getE2EESupportInfo();
      if (!supportInfo.insertableStreams || !supportInfo.webCrypto || !supportInfo.x25519) {
        console.warn('E2EE not supported:', supportInfo);
        setE2eeStatus('unsupported');
        // Still connect to room without E2EE
        await connectToRoom();
        return;
      }

      console.log('E2EE support confirmed:', supportInfo);

      // Generate X25519 keypair
      const keypair = await generateX25519Keypair();
      setMyKeypair(keypair);

      // Connect to room
      await connectToRoom();
    } catch (error) {
      console.error('Failed to initialize room:', error);
      setE2eeStatus('error');
    }
  };

  const connectToRoom = async () => {
    try {
      console.log('Getting LiveKit token for room:', roomName);
      
      // Get LiveKit token
      const tokenResponse = await fetch(`/api/livekit/token?roomName=${roomName}`);
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token request failed:', tokenResponse.status, errorText);
        throw new Error(`Failed to get LiveKit token: ${tokenResponse.status}`);
      }

      const { token, url } = await tokenResponse.json();
      console.log('Got LiveKit token, URL:', url);

      // Create E2EE key provider
      const e2eeKeyProvider = new ExternalE2EEKeyProvider();
      setE2eeKeyProvider(e2eeKeyProvider);
      
      // Create room instance with E2EE support
      const roomInstance = new Room({
        adaptiveStream: true,
        dynacast: true,
        e2ee: {
          keyProvider: e2eeKeyProvider,
          worker: new Worker(new URL('livekit-client/e2ee-worker', import.meta.url)),
        },
        publishDefaults: {
          audioPreset: {
            maxBitrate: 32000,
            priority: 'high',
          },
        },
      });

      // Set up event listeners
      setupRoomEventListeners(roomInstance);

      console.log('Connecting to LiveKit room...');
      // Connect to room
      await roomInstance.connect(url, token);
      
      setRoom(roomInstance);
      roomRef.current = roomInstance;
      setIsConnected(true);
      console.log('Successfully connected to LiveKit room');
      
      // Log current participants
      console.log('Current participants:', roomInstance.remoteParticipants.size);
      roomInstance.remoteParticipants.forEach((participant, identity) => {
        console.log('Remote participant:', identity, 'Expected peer:', peerId);
        console.log('Participant identity type:', typeof identity);
        console.log('Expected peer ID type:', typeof peerId);
        console.log('Identity match:', identity === peerId);
        if (identity === peerId) {
          console.log('✅ Found expected peer in room!');
          setPeerParticipant(participant);
        }
      });

      // If no peer found, check again after a short delay
      if (roomInstance.remoteParticipants.size === 0) {
        console.log('No participants found, will check again...');
        setTimeout(() => {
          console.log('Rechecking participants after 2 seconds...');
          console.log('Current participants:', roomInstance.remoteParticipants.size);
          roomInstance.remoteParticipants.forEach((participant, identity) => {
            console.log('Found participant on recheck:', identity, 'Expected:', peerId);
            if (identity === peerId) {
              console.log('✅ Found expected peer on recheck!');
              setPeerParticipant(participant);
            }
          });
        }, 2000);
      }

      // Wait a moment for connection to stabilize, then start E2EE key exchange
      setTimeout(async () => {
        if (e2eeStatus !== 'unsupported') {
          console.log('Starting E2EE key exchange after connection...');
          await startE2EEKeyExchange(roomInstance);
        } else {
          console.log('E2EE not supported, proceeding without encryption');
          setE2eeStatus('ready'); // Allow room to work without E2EE
        }
      }, 1000);
      
      // Also check for peer after a longer delay in case they're still connecting
      setTimeout(() => {
        console.log('Checking for peer participant after 3 seconds...');
        console.log('Current remote participants:', roomInstance.remoteParticipants.size);
        roomInstance.remoteParticipants.forEach((participant, identity) => {
          console.log('Found participant:', identity, 'Expected:', peerId);
          if (identity === peerId) {
            console.log('✅ Setting peer participant from delayed check');
            setPeerParticipant(participant);
          }
        });
      }, 3000);

    } catch (error) {
      console.error('Failed to connect to room:', error);
      setE2eeStatus('error');
    }
  };

  const setupRoomEventListeners = (roomInstance: Room) => {
    roomInstance.on(RoomEvent.Connected, () => {
      console.log('Connected to room');
      setIsConnected(true);
    });

    roomInstance.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from room');
      setIsConnected(false);
    });

    roomInstance.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity, 'Expected peer:', peerId);
      console.log('Participant identity type:', typeof participant.identity);
      console.log('Expected peer ID type:', typeof peerId);
      console.log('Identity match:', participant.identity === peerId);
      if (participant.identity === peerId) {
        console.log('✅ Correct peer connected!');
        setPeerParticipant(participant);
      } else {
        console.log('⚠️ Unexpected participant connected:', participant.identity);
      }
    });

    roomInstance.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      if (participant.identity === peerId) {
        setPeerParticipant(null);
        // Trigger rekey on participant change
        if (e2eeStatus === 'ready') {
          handleRekey();
        }
      }
    });

    roomInstance.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
      console.log('Data received from:', participant?.identity, 'expected peer:', peerId);
      if (participant?.identity === peerId) {
        handleDataReceived(payload, roomInstance);
      }
    });

    roomInstance.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant?.identity === session?.user?.id) {
        // Map LiveKit ConnectionQuality to our state type
        const qualityMap: Record<string, 'excellent' | 'good' | 'poor'> = {
          'excellent': 'excellent',
          'good': 'good',
          'poor': 'poor',
          'unknown': 'poor'
        };
        setConnectionQuality(qualityMap[quality] || 'poor');
      }
    });

    // Monitor audio levels
    roomInstance.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === 'audio' && participant?.identity === peerId) {
        console.log('Audio track subscribed for peer');
        setPeerMicEnabled(true);
        
        // Monitor audio levels for peer
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaStreamSource(new MediaStream([track.mediaStreamTrack]));
          source.connect(analyser);
          
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const updateAudioLevel = () => {
            if (track.mediaStreamTrack.readyState === 'live') {
              analyser.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
              const normalizedLevel = average / 255;
              setPeerAudioLevel(normalizedLevel);
              requestAnimationFrame(updateAudioLevel);
            }
          };
          updateAudioLevel();
        } catch (error) {
          console.error('Failed to monitor peer audio:', error);
        }
      }
    });

    roomInstance.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      if (track.kind === 'audio' && participant?.identity === peerId) {
        console.log('Audio track unsubscribed for peer');
        setPeerMicEnabled(false);
        setPeerAudioLevel(0);
      }
    });

    // Monitor track mute/unmute events
    roomInstance.on(RoomEvent.TrackMuted, (publication, participant) => {
      if (publication.kind === 'audio' && participant?.identity === peerId) {
        console.log('Peer audio track muted');
        setPeerMicEnabled(false);
        setPeerAudioLevel(0);
      }
    });

    roomInstance.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      if (publication.kind === 'audio' && participant?.identity === peerId) {
        console.log('Peer audio track unmuted');
        setPeerMicEnabled(true);
      }
    });

    // Monitor local audio level
    const monitorLocalAudio = () => {
      if (roomInstance && roomInstance.localParticipant.audioTrackPublications.size > 0) {
        const audioTrack = Array.from(roomInstance.localParticipant.audioTrackPublications.values())[0];
        if (audioTrack.track) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack.track.mediaStreamTrack]));
          source.connect(analyser);
          
          analyser.fftSize = 256;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const updateLocalAudioLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setMyAudioLevel(average / 255);
            requestAnimationFrame(updateLocalAudioLevel);
          };
          updateLocalAudioLevel();
        }
      }
    };

    // Start monitoring local audio when mic is enabled
    if (isMicEnabled) {
      monitorLocalAudio();
    }
  };

  const startE2EEKeyExchange = async (roomInstance: Room) => {
    try {
      setE2eeStatus('exchanging');
      console.log('Starting E2EE key exchange...');
      console.log('My keypair available:', !!myKeypair);

      // If keypair is not available, generate it now
      let currentKeypair = myKeypair;
      if (!currentKeypair) {
        console.log('Generating keypair for key exchange...');
        currentKeypair = await generateX25519Keypair();
        setMyKeypair(currentKeypair);
        console.log('Keypair generated and set');
      }

      // Determine who initiates based on user ID comparison (alphabetical order)
      const myUserId = session?.user?.id;
      const shouldInitiate = myUserId && peerId && myUserId < peerId;
      console.log('Should initiate key exchange:', shouldInitiate, 'myUserId:', myUserId, 'peerId:', peerId);

      if (shouldInitiate) {
        // Send our public key first
        if (currentKeypair) {
          const publicKeyData = {
            type: 'e2ee-pubkey',
            publicKey: arrayBufferToBase64(currentKeypair.publicKey),
            timestamp: Date.now(),
          };

          const encoder = new TextEncoder();
          await roomInstance.localParticipant.publishData(
            encoder.encode(JSON.stringify(publicKeyData)),
            { reliable: true }
          );
          console.log('Sent public key to peer (initiator)');
          setSentMyPublicKey(true);
        } else {
          console.log('No keypair available for initiator');
        }
      } else {
        console.log('Waiting for peer to send public key first...');
      }

      // Set up a timeout for key exchange
      const keyExchangeTimeout = setTimeout(() => {
        console.log('Key exchange timeout - no peer key received');
        setE2eeStatus('error');
      }, 10000); // 10 second timeout

      // Store timeout for cleanup
      setKeyExchangeTimeout(keyExchangeTimeout);

    } catch (error) {
      console.error('Failed to start E2EE key exchange:', error);
      setE2eeStatus('error');
    }
  };

  const handleDataReceived = async (payload: Uint8Array, roomInstance?: Room) => {
    try {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(payload));
      
      console.log('Received data:', data.type, 'from peer');
      
      if (data.type === 'e2ee-pubkey' && !peerPublicKey) {
        console.log('Received peer public key');
        const peerKey = base64ToArrayBuffer(data.publicKey);
        setPeerPublicKey(new Uint8Array(peerKey));
        
        // If we haven't sent our public key yet, send it now
        if (!sentMyPublicKey) {
          // Ensure we have a keypair
          let currentKeypair = myKeypair;
          if (!currentKeypair) {
            console.log('Generating keypair for response...');
            currentKeypair = await generateX25519Keypair();
            setMyKeypair(currentKeypair);
          }
          
          if (currentKeypair) {
            // Use the room instance passed to the function, or fall back to the state
            const roomToUse = roomInstance || room;
            
            if (roomToUse) {
              console.log('Sending our public key in response...');
              const publicKeyData = {
                type: 'e2ee-pubkey',
                publicKey: arrayBufferToBase64(currentKeypair.publicKey),
                timestamp: Date.now(),
              };

              const encoder = new TextEncoder();
              await roomToUse.localParticipant.publishData(
                encoder.encode(JSON.stringify(publicKeyData)),
                { reliable: true }
              );
              console.log('Sent our public key in response');
              setSentMyPublicKey(true);
            } else {
              console.log('No room instance available for sending response');
            }
          } else {
            console.log('Cannot send response key - no keypair available');
          }
        } else {
          console.log('Already sent our public key');
        }
      } else if (data.type === 'e2ee-rekey-pubkey') {
        // Handle rekey
        console.log('Received rekey public key');
        handleRekeyWithPeerKey(new Uint8Array(base64ToArrayBuffer(data.publicKey)));
      }
    } catch (error) {
      console.error('Failed to handle data:', error);
    }
  };

  // Complete E2EE setup when both keys are available
  useEffect(() => {
    if (myKeypair && peerPublicKey && room && (e2eeStatus === 'exchanging' || e2eeStatus === 'initializing')) {
      console.log('Triggering E2EE setup with status:', e2eeStatus);
      completeE2EESetup();
    }
  }, [myKeypair, peerPublicKey, room, e2eeStatus]);

  // Auto-enable microphone when E2EE is ready
  useEffect(() => {
    if (e2eeStatus === 'ready' && room && !isMicEnabled) {
      console.log('E2EE ready, enabling microphone...');
      const enableMic = async () => {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsMicEnabled(true);
        } catch (error) {
          console.error('Failed to enable microphone:', error);
        }
      };
      enableMic();
    }
  }, [e2eeStatus, room, isMicEnabled]);

  // Monitor local audio levels when mic is enabled
  useEffect(() => {
    let animationFrameId: number;
    
    if (isMicEnabled && room) {
      const monitorLocalAudio = () => {
        if (room && room.localParticipant.audioTrackPublications.size > 0) {
          const audioTrack = Array.from(room.localParticipant.audioTrackPublications.values())[0];
          if (audioTrack.track && audioTrack.track.mediaStreamTrack) {
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const analyser = audioContext.createAnalyser();
              const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack.track.mediaStreamTrack]));
              source.connect(analyser);
              
              analyser.fftSize = 256;
              analyser.smoothingTimeConstant = 0.8;
              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              
              const updateLocalAudioLevel = () => {
                if (isMicEnabled && room && audioTrack.track && audioTrack.track.mediaStreamTrack && audioTrack.track.mediaStreamTrack.readyState === 'live') {
                  analyser.getByteFrequencyData(dataArray);
                  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                  setMyAudioLevel(average / 255);
                  animationFrameId = requestAnimationFrame(updateLocalAudioLevel);
                }
              };
              updateLocalAudioLevel();
            } catch (error) {
              console.error('Failed to monitor local audio:', error);
            }
          }
        }
      };
      
      monitorLocalAudio();
    } else {
      setMyAudioLevel(0);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isMicEnabled, room]);

  // Periodic check for peer microphone state
  useEffect(() => {
    if (peerParticipant && room) {
      const checkPeerMicState = () => {
        const audioTracks = Array.from(peerParticipant.audioTrackPublications.values());
        if (audioTracks.length > 0) {
          const audioTrack = audioTracks[0];
          const isMuted = audioTrack.isMuted;
          setPeerMicEnabled(!isMuted);
          
          if (isMuted) {
            setPeerAudioLevel(0);
          }
        } else {
          setPeerMicEnabled(false);
          setPeerAudioLevel(0);
        }
      };
      
      // Check immediately
      checkPeerMicState();
      
      // Check every 2 seconds
      const interval = setInterval(checkPeerMicState, 2000);
      
      return () => clearInterval(interval);
    }
  }, [peerParticipant, room]);

  const completeE2EESetup = async () => {
    try {
      if (!myKeypair || !peerPublicKey || !room) {
        console.log('Missing requirements for E2EE setup:', { myKeypair: !!myKeypair, peerPublicKey: !!peerPublicKey, room: !!room });
        return;
      }

      // Prevent multiple E2EE setups
      if (e2eeStatus === 'ready' || e2eeStatus === 'error') {
        console.log('E2EE already completed or failed, skipping setup');
        return;
      }

      console.log('Starting E2EE setup...');

      // Derive shared secret
      const sharedSecret = await deriveSharedSecret(myKeypair.privateKey, peerPublicKey);
      console.log('Shared secret derived');
      
      // Derive encryption key
      const encryptionKey = await hkdf(sharedSecret, roomName, keyIndex);
      console.log('Encryption key derived');
      
      // Setup SFrame encryption using the key provider
      if (!e2eeKeyProvider) {
        console.error('E2EE key provider not found');
        setE2eeStatus('error');
        return;
      }

      // Set the encryption key
      try {
        await e2eeKeyProvider.setKey(encryptionKey.slice().buffer);
        console.log('Set encryption key with index:', keyIndex);
      } catch (keyError) {
        console.error('Failed to set encryption key:', keyError);
        setE2eeStatus('error');
        return;
      }
      
      // Enable E2EE on the room
      try {
        await room.setE2EEEnabled(true);
        console.log('E2EE enabled on room');
      } catch (e2eeError) {
        console.error('Failed to enable E2EE:', e2eeError);
        setE2eeStatus('error');
        return;
      }
      
      // Wait a moment to ensure both sides have set their keys
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setE2eeStatus('ready');
      console.log('E2EE setup completed successfully');
      
      // Clear timeout
      if (keyExchangeTimeout) {
        clearTimeout(keyExchangeTimeout);
        setKeyExchangeTimeout(null);
      }
      
      // Clear sensitive data
      clearSensitiveData(sharedSecret);
      clearSensitiveData(encryptionKey);
    } catch (error) {
      console.error('Failed to complete E2EE setup:', error);
      setE2eeStatus('error');
    }
  };

  const handleRekey = async () => {
    if (!myKeypair || !peerPublicKey || !room) return;

    try {
      // Generate new keypair
      const newKeypair = await generateX25519Keypair();
      setMyKeypair(newKeypair);

      // Send new public key
      const publicKeyData = {
        type: 'e2ee-rekey-pubkey',
        publicKey: arrayBufferToBase64(newKeypair.publicKey),
        timestamp: Date.now(),
      };

      const encoder = new TextEncoder();
      await room.localParticipant.publishData(
        encoder.encode(JSON.stringify(publicKeyData)),
        { reliable: true }
      );

      // Clear old keypair
      if (myKeypair.privateKey) {
        // Note: CryptoKey objects can't be explicitly cleared, but they'll be GC'd
      }

    } catch (error) {
      console.error('Failed to rekey:', error);
    }
  };

  const handleRekeyWithPeerKey = async (newPeerKey: Uint8Array) => {
    if (!myKeypair || !room) return;

    try {
      // Derive new shared secret
      const sharedSecret = await deriveSharedSecret(myKeypair.privateKey, newPeerKey);
      
      // Derive new encryption key with incremented index
      const newKeyIndex = keyIndex + 1;
      const encryptionKey = await hkdf(sharedSecret, roomName, newKeyIndex);
      
      // Setup new encryption using key provider
      if (!e2eeKeyProvider) {
        console.error('E2EE key provider not found during rekey');
        return;
      }

      // Set the new encryption key
      await e2eeKeyProvider.setKey(encryptionKey.slice().buffer);
      console.log('Set new encryption key with index:', newKeyIndex);
      
      setKeyIndex(newKeyIndex);
      setPeerPublicKey(newPeerKey);
      console.log('Rekey completed with key index:', newKeyIndex);
      
      // Clear sensitive data
      clearSensitiveData(sharedSecret);
      clearSensitiveData(encryptionKey);
    } catch (error) {
      console.error('Failed to complete rekey:', error);
    }
  };

  const toggleMic = async () => {
    if (!room) return;

    try {
      if (isMicEnabled) {
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsMicEnabled(false);
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsMicEnabled(true);
      }
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const toggleVolume = () => {
    setIsVolumeEnabled(!isVolumeEnabled);
    // TODO: Implement volume control
  };

  const handleLeave = async () => {
    try {
      if (room) {
        await room.disconnect();
      }
    } catch (error) {
      console.error('Failed to disconnect from room:', error);
    } finally {
      cleanup();
      onLeave();
    }
  };

  const cleanup = () => {
    if (rekeyTimer) {
      clearTimeout(rekeyTimer);
      setRekeyTimer(null);
    }
    
    if (keyExchangeTimeout) {
      clearTimeout(keyExchangeTimeout);
      setKeyExchangeTimeout(null);
    }
    
    if (room) {
      room.disconnect();
    }
  };

  const getStatusText = () => {
    switch (e2eeStatus) {
      case 'initializing':
        return 'Connecting...';
      case 'exchanging':
        return 'Exchanging keys...';
      case 'ready':
        return 'Encrypted ✓';
      case 'error':
        return 'Encryption Error';
      case 'unsupported':
        return 'Not Encrypted';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (e2eeStatus) {
      case 'ready':
        return 'text-green-500';
      case 'error':
      case 'unsupported':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d]">
      {/* Left Sidebar - Voice Controls */}
      <div className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white mb-2">Voice Chat</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Voice Controls */}
        <div className="p-6 space-y-6">
          {/* Microphone */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Microphone</label>
            <button
              onClick={toggleMic}
              disabled={e2eeStatus !== 'ready'}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                isMicEnabled
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
              } ${e2eeStatus !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              {isMicEnabled ? 'Mute' : 'Unmute'}
              {e2eeStatus !== 'ready' && <Lock className="w-4 h-4" />}
            </button>
          </div>

          {/* Volume */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Volume</label>
            <button
              onClick={toggleVolume}
              className="w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
            >
              {isVolumeEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              {isVolumeEnabled ? 'Mute All' : 'Unmute All'}
            </button>
          </div>

          {/* E2EE Status */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Encryption</label>
            <div className={`p-3 rounded-lg bg-black/20 flex items-center gap-2 ${getStatusColor()}`}>
              {e2eeStatus === 'ready' ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
          </div>

          {/* Connection Quality */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Connection</label>
            <div className="p-3 rounded-lg bg-black/20">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionQuality === 'excellent' ? 'bg-green-500' :
                  connectionQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-300 capitalize">{connectionQuality}</span>
              </div>
            </div>
          </div>

          {/* Leave Button */}
          <button
            onClick={handleLeave}
            className="w-full py-3 px-4 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Leave Room
          </button>
        </div>
      </div>

      {/* Center - Whiteboard Placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <Users className="w-12 h-12 text-white/50" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Whiteboard</h3>
          <p className="text-gray-400">Collaborative drawing coming soon</p>
        </div>
      </div>

      {/* Right Sidebar - Participant Info */}
      <div className="w-80 bg-black/20 backdrop-blur-xl border-l border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Participants</h3>
        
        <div className="space-y-4">
          {/* Current User */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{session?.user?.name || 'You'}</p>
                  <p className="text-sm text-gray-400">Connected</p>
                </div>
                <div className="flex items-center gap-2">
                  {isMicEnabled ? (
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-green-400" />
                      <AudioWaveform level={myAudioLevel} isActive={isMicEnabled && myAudioLevel > 0.1} />
                    </div>
                  ) : (
                    <MicOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Peer User */}
          {peerParticipant ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Anonymous User</p>
                    <p className="text-sm text-gray-400">Connected</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {peerMicEnabled ? (
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-green-400" />
                        <AudioWaveform level={peerAudioLevel} isActive={peerMicEnabled && peerAudioLevel > 0.1} />
                      </div>
                    ) : (
                      <MicOff className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-white/50" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Waiting...</p>
                    <p className="text-sm text-gray-400">No participant</p>
                  </div>
                  <MicOff className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Shared Topics */}
          {peerTopics.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-300 mb-2">Shared Topics</p>
              <div className="flex flex-wrap gap-2">
                {peerTopics.map((topic) => (
                  <span
                    key={topic}
                    className="px-2 py-1 bg-primary/20 text-primary rounded text-xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogComponent />
    </div>
  );
}
