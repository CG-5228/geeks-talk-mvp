import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Public site config (e.g. social links). Read from server env at request time.
 * Only exposes NEXT_PUBLIC_* social link URLs - never secrets.
 */

// Cache for loaded env values (only public social URLs)
let envCache: Record<string, string> | null = null;

// Only these keys are allowed to be exposed
const ALLOWED_KEYS = [
  'NEXT_PUBLIC_INSTAGRAM_URL',
  'NEXT_PUBLIC_X_URL',
  'NEXT_PUBLIC_DISCORD_URL',
  'NEXT_PUBLIC_FACEBOOK_URL',
  'NEXT_PUBLIC_YOUTUBE_URL',
];

// Explicitly load .env file and return only allowed public values
function loadPublicEnv(): Record<string, string> {
  if (envCache) return envCache;
  
  const result: Record<string, string> = {};
  const envPaths = [
    '/var/www/geekstalk/shared/.env',
    '/var/www/geekstalk/current/.env',
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
              // Only load allowed public keys
              if (ALLOWED_KEYS.includes(key)) {
                let value = trimmed.slice(eqIndex + 1).trim();
                // Remove surrounding quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                  value = value.slice(1, -1);
                }
                result[key] = value;
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
  
  envCache = result;
  return result;
}

function getPublicEnv(key: string): string {
  if (!ALLOWED_KEYS.includes(key)) return '#';
  
  // First check process.env
  if (process.env[key]) {
    return process.env[key]!;
  }
  // Then check loaded env file
  const loaded = loadPublicEnv();
  return loaded[key] || '#';
}

export async function GET() {
  const config = {
    instagramUrl: getPublicEnv('NEXT_PUBLIC_INSTAGRAM_URL'),
    xUrl: getPublicEnv('NEXT_PUBLIC_X_URL'),
    discordUrl: getPublicEnv('NEXT_PUBLIC_DISCORD_URL'),
    facebookUrl: getPublicEnv('NEXT_PUBLIC_FACEBOOK_URL'),
    youtubeUrl: getPublicEnv('NEXT_PUBLIC_YOUTUBE_URL'),
  };
  return NextResponse.json(config);
}
