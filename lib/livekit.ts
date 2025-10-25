import { AccessToken } from 'livekit-server-sdk';

export interface LiveKitTokenOptions {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  metadata?: string;
}

export async function generateLiveKitToken({
  roomName,
  participantName,
  participantIdentity,
  canPublish = true,
  canSubscribe = true,
  canPublishData = true,
  metadata,
}: LiveKitTokenOptions): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    // For development, return a mock token
    console.error('❌ LiveKit API key and secret not configured!');
    console.error('Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.');
    console.error('Current env check:', {
      LIVEKIT_API_KEY: !!apiKey,
      LIVEKIT_API_SECRET: !!apiSecret,
      LIVEKIT_URL: !!process.env.LIVEKIT_URL
    });
    throw new Error('LiveKit credentials not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.');
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    metadata,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData,
  });

  return await token.toJwt();
}

export function generateVoiceRoomName(channelId: string, groupId: string): string {
  return `voice:${channelId}:${groupId}`;
}

export function parseVoiceRoomName(roomName: string): { channelId: string; groupId: string } | null {
  const match = roomName.match(/^voice:([^:]+):(.+)$/);
  if (!match) return null;
  
  return {
    channelId: match[1],
    groupId: match[2],
  };
}
