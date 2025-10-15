import { NextResponse } from 'next/server';
// import { Server as IOServer } from 'socket.io';
// import { setIO } from '@/lib/socket';

// Placeholder route to reserve /api/socket while we wire up a compatible Socket.IO server.
// Notes for wiring (App Router compatible):
// - Create a Node HTTP server (Next dev provides one) and attach a Socket.IO server to it once.
// - Then call setIO(io) so API routes can emit without importing the server directly.
// - In production (Next start), prefer a custom server or edge-incompatible alternatives (like Pusher/Ably) if needed.
export async function GET() {
  return NextResponse.json({ ok: false, message: 'Socket endpoint not yet implemented for App Router' }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}