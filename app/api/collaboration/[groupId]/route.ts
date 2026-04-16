import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { groupId } = params;

    // For now, return a simple response indicating the endpoint is ready
    // The actual WebSocket implementation will be handled by the client-side provider
    return new Response(JSON.stringify({
      status: 'ready',
      groupId,
      message: 'Collaboration endpoint ready for WebSocket connection'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Collaboration API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { groupId } = params;
    const body = await request.json();

    // Handle document save requests
    if (body.type === 'save') {
      // TODO: Save document content to database

      return new Response(JSON.stringify({
        status: 'saved',
        groupId,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      status: 'received',
      groupId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Collaboration API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
