import { NextResponse } from 'next/server';

/**
 * Public site config (e.g. social links). Read from server env at request time
 * so production uses /var/www/geekstalk/shared/.env instead of build-time values.
 */
export async function GET() {
  const config = {
    instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#',
    xUrl: process.env.NEXT_PUBLIC_X_URL || '#',
    discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL || '#',
    facebookUrl: process.env.NEXT_PUBLIC_FACEBOOK_URL || '#',
    youtubeUrl: process.env.NEXT_PUBLIC_YOUTUBE_URL || '#',
  };
  return NextResponse.json(config);
}
