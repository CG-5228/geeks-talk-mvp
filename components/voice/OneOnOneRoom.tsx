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
  AlertCircle
} from 'lucide-react';
import { Room, RoomEvent, RemoteParticipant, LocalParticipant } from 'livekit-client';
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
  
  // E2EE state
  const [myKeypair, setMyKeypair] = useState<{ publicKey: Uint8Array; privateKey: CryptoKey } | null>(null);
  const [peerPublicKey, setPeerPublicKey] = useState<Uint8Array | null>(null);
  const [keyIndex, setKeyIndex] = useState(0);
  const [rekeyTimer, setRekeyTimer] = useState<NodeJS.Timeout | null>(null);
  
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
      // Check E2EE support
      const supportInfo = getE2EESupportInfo();
      if (!supportInfo.insertableStreams || !supportInfo.webCrypto || !supportInfo.x25519) {
        console.warn('E2EE not supported:', supportInfo);
        setE2eeStatus('unsupported');
        // Still connect to room without E2EE
        await connectToRoom();
        return;
      }

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
        if (identity === peerId) {
          console.log('✅ Found expected peer in room!');
          setPeerParticipant(participant);
        }
      });

      // Wait a moment for connection to stabilize, then start E2EE key exchange
      setTimeout(async () => {
        if (e2eeStatus !== 'unsupported') {
          console.log('Starting E2EE key exchange after connection...');
          await startE2EEKeyExchange(roomInstance);
        }
      }, 1000);
      
      // Also check for peer after a longer delay in case they're still connecting
      setTimeout(() => {
        console.log('Checking for peer participant after 3 seconds...');
        console.log('Current remote participants:', roomInstance.remoteParticipants.size);
        roomInstance.remoteParticipants.forEach((participant, identity) => {
          console.log('Found participant:', identity, 'Expected:', peerId);
          if (identity === peerId && !peerParticipant) {
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
        handleDataReceived(payload);
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
  };

  const startE2EEKeyExchange = async (roomInstance: Room) => {
    try {
      setE2eeStatus('exchanging');
      console.log('Starting E2EE key exchange...');

      // Send our public key
      if (myKeypair) {
        const publicKeyData = {
          type: 'e2ee-pubkey',
          publicKey: arrayBufferToBase64(myKeypair.publicKey),
          timestamp: Date.now(),
        };

        const encoder = new TextEncoder();
        await roomInstance.localParticipant.publishData(
          encoder.encode(JSON.stringify(publicKeyData)),
          { reliable: true }
        );
        console.log('Sent public key to peer');
      }

      // Set up a timeout for key exchange
      const keyExchangeTimeout = setTimeout(() => {
        if (e2eeStatus === 'exchanging') {
          console.log('Key exchange timeout - no peer key received');
          setE2eeStatus('error');
        }
      }, 10000); // 10 second timeout

      // Store timeout for cleanup
      setKeyExchangeTimeout(keyExchangeTimeout);

    } catch (error) {
      console.error('Failed to start E2EE key exchange:', error);
      setE2eeStatus('error');
    }
  };

  const handleDataReceived = (payload: Uint8Array) => {
    try {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(payload));
      
      console.log('Received data:', data.type);
      
      if (data.type === 'e2ee-pubkey' && !peerPublicKey) {
        console.log('Received peer public key');
        const peerKey = base64ToArrayBuffer(data.publicKey);
        setPeerPublicKey(new Uint8Array(peerKey));
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
    if (myKeypair && peerPublicKey && room && e2eeStatus === 'exchanging') {
      completeE2EESetup();
    }
  }, [myKeypair, peerPublicKey, room, e2eeStatus]);

  const completeE2EESetup = async () => {
    try {
      if (!myKeypair || !peerPublicKey || !room) {
        console.log('Missing requirements for E2EE setup:', { myKeypair: !!myKeypair, peerPublicKey: !!peerPublicKey, room: !!room });
        return;
      }

      console.log('Starting E2EE setup...');

      // Derive shared secret
      const sharedSecret = await deriveSharedSecret(myKeypair.privateKey, peerPublicKey);
      console.log('Shared secret derived');
      
      // Derive encryption key
      const encryptionKey = await hkdf(sharedSecret, roomName, keyIndex);
      console.log('Encryption key derived');
      
      // Setup SFrame encryption
      const success = await setupSFrameEncryption(room, encryptionKey, keyIndex);
      console.log('SFrame setup result:', success);
      
      if (success) {
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
      } else {
        console.log('SFrame setup failed');
        setE2eeStatus('error');
      }
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
      
      // Setup new encryption
      const success = await setupSFrameEncryption(room, encryptionKey, newKeyIndex);
      
      if (success) {
        setKeyIndex(newKeyIndex);
        setPeerPublicKey(newPeerKey);
        console.log('Rekey completed with key index:', newKeyIndex);
        
        // Clear sensitive data
        clearSensitiveData(sharedSecret);
        clearSensitiveData(encryptionKey);
      }
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
        <h3 className="text-lg font-semibold text-white mb-4">Participant</h3>
        
        {peerParticipant ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-white">Anonymous User</p>
                <p className="text-sm text-gray-400">Connected</p>
              </div>
            </div>

            {peerTopics.length > 0 && (
              <div>
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
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-white/50" />
            </div>
            <p className="text-gray-400">Waiting for participant...</p>
          </div>
        )}
      </div>

      <DialogComponent />
    </div>
  );
}
