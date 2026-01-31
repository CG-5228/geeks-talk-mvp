import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Public site config (e.g. social links). Read from server env at request time
 * so production uses /var/www/geekstalk/shared/.env instead of build-time values.
 */

// Explicitly load .env if values are missing (fallback for production)
function loadEnvFile() {
  const envPaths = [
    '/var/www/geekstalk/shared/.env',
    resolve(process.cwd(), '.env'),
  ];
  
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
              const key = trimmed.slice(0, eqIndex).trim();
              let value = trimmed.slice(eqIndex + 1).trim();
              // Remove surrounding quotes if present
              if ((value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
              }
              // Only set if not already in process.env
              if (!process.env[key]) {
                process.env[key] = value;
              }
            }
          }
        }
        break; // Stop after first found file
      } catch (e) {
        // Ignore read errors
      }
    }
  }
}

export async function GET() {
  // Load env file if needed (handles case where systemd didn't load it)
  if (!process.env.NEXT_PUBLIC_INSTAGRAM_URL) {
    loadEnvFile();
  }

  const config = {
    instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#',
    xUrl: process.env.NEXT_PUBLIC_X_URL || '#',
    discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL || '#',
    facebookUrl: process.env.NEXT_PUBLIC_FACEBOOK_URL || '#',
    youtubeUrl: process.env.NEXT_PUBLIC_YOUTUBE_URL || '#',
  };
  return NextResponse.json(config);
}
