import { NextResponse } from 'next/server';
import { verifyAndConsumeEmailCode } from '@/lib/verification';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: string; purpose?: 'signup'|'reset'|'change'; code?: string };
  const email = (body?.email || '').trim().toLowerCase();
  const purpose = body?.purpose || 'signup';
  const code = (body?.code || '').trim();
  if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 });

  const res = await verifyAndConsumeEmailCode(email, purpose, code);
  if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 400 });
  return NextResponse.json({ ok: true });
}


