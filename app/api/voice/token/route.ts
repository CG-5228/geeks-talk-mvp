import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Voice token generation not configured' }, { status: 501 });
}