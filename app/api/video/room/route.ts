import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';

// In-memory storage for room codes (use Redis/database in production)
const roomCodes = new Map<string, {
  roomName: string;
  creatorId: string;
  createdAt: number;
}>();

// Room code TTL: 1 hour
const ROOM_CODE_TTL = 60 * 60 * 1000;

// Cleanup old room codes periodically
setInterval(() => {
  const now = Date.now();
  roomCodes.forEach((room, code) => {
    if (now - room.createdAt > ROOM_CODE_TTL) {
      roomCodes.delete(code);
    }
  });
}, 60000); // Run every minute

// Generate a short, shareable room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (roomCodes.has(code)); // Ensure unique
  return code;
}

// POST /api/video/room - Create a new room with code
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const roomCode = generateRoomCode();
    const roomName = `video-group-${roomCode.toLowerCase()}-${nanoid(6)}`;

    roomCodes.set(roomCode, {
      roomName,
      creatorId: session.user.id,
      createdAt: Date.now(),
    });

    console.log('[Video Room] Created room:', { roomCode, roomName, creator: session.user.id });

    return NextResponse.json({
      roomCode,
      roomName,
    });

  } catch (error) {
    console.error('Error creating video room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/video/room?code=XXXXXX - Get room by code
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code')?.toUpperCase();

  if (!code) {
    return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
  }

  if (code.length !== 6) {
    return NextResponse.json({ error: 'Invalid room code format' }, { status: 400 });
  }

  try {
    const room = roomCodes.get(code);

    if (!room) {
      return NextResponse.json({ error: 'Room not found or expired' }, { status: 404 });
    }

    // Check if room is still valid
    if (Date.now() - room.createdAt > ROOM_CODE_TTL) {
      roomCodes.delete(code);
      return NextResponse.json({ error: 'Room has expired' }, { status: 404 });
    }

    console.log('[Video Room] User joining room:', { 
      code, 
      roomName: room.roomName, 
      userId: session.user.id 
    });

    return NextResponse.json({
      roomCode: code,
      roomName: room.roomName,
    });

  } catch (error) {
    console.error('Error getting video room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
