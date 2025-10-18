import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChannelsForUser, createPrivateChannel } from '@/lib/live/channels';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;
  const data = await getChannelsForUser(userId);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  
  // Handle both old format (name, topic) and new format (settings object)
  let name: string, description: string | undefined;
  
  if (body.name && typeof body.name === 'string') {
    // New format with settings object
    name = body.name;
    description = body.description;
  } else if (body.settings && body.settings.name) {
    // New format with settings object
    name = body.settings.name;
    description = body.settings.description;
  } else {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  
  // For now, we'll use the existing createPrivateChannel function
  // In the future, we can extend this to handle all the new settings
  const ch = await createPrivateChannel(userId, name, description);
  return NextResponse.json(ch, { status: 201 });
}
