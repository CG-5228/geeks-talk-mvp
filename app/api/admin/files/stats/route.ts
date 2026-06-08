import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/adminGate';
import { S3_BUCKET, S3_REGION, getFileStats } from '@/lib/filesAdminServer';

export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  try {
    const stats = await getFileStats();
    return NextResponse.json({
      ...stats,
      storage: {
        bucket: S3_BUCKET,
        region: S3_REGION,
      },
    });
  } catch (error) {
    console.error('Files stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch stats',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
