import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Public site config (e.g. social links). Read from server env at request time.
 * Only exposes NEXT_PUBLIC_* social link URLs - never secrets.
 */

// Only these keys are allowed to be exposed (whitelist for security)
const ALLOWED_KEYS = new Set([
  'NEXT_PUBLIC_INSTAGRAM_URL',
  'NEXT_PUBLIC_X_URL',
  'NEXT_PUBLIC_DISCORD_URL',
  'NEXT_PUBLIC_FACEBOOK_URL',
  'NEXT_PUBLIC_YOUTUBE_URL',
]);

// Read social URLs directly from .env file (always fresh, no cache issues)
function getSocialUrls(): Record<string, string> {
  const result: Record<string, string> = {
    NEXT_PUBLIC_INSTAGRAM_URL: '#',
    NEXT_PUBLIC_X_URL: '#',
    NEXT_PUBLIC_DISCORD_URL: '#',
    NEXT_PUBLIC_FACEBOOK_URL: '#',
    NEXT_PUBLIC_YOUTUBE_URL: '#',
  };

  // First try process.env (systemd EnvironmentFile)
  for (const key of ALLOWED_KEYS) {
    const val = process.env[key];
    if (val && val.trim()) {
      result[key] = val.trim();
    }
  }

  // If any are still '#', try reading from .env file directly
  const needsFileRead = Object.values(result).some(v => v === '#');
  if (needsFileRead) {
    const envPaths = [
      '/var/www/geekstalk/shared/.env',
      '/var/www/geekstalk/current/.env',
      resolve(process.cwd(), '.env'),
    ];

    for (const envPath of envPaths) {
      try {
        if (!existsSync(envPath)) continue;
        
        const content = readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx <= 0) continue;
          
          const key = trimmed.slice(0, eqIdx).trim();
          if (!ALLOWED_KEYS.has(key)) continue;
          if (result[key] !== '#') continue; // Already have value from process.env
          
          let value = trimmed.slice(eqIdx + 1).trim();
          // Remove quotes
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (value) {
            result[key] = value;
          }
        }
        break; // Found and read file
      } catch {
        // Try next path
      }
    }
  }

  return result;
}

export async function GET() {
  const urls = getSocialUrls();
  
  return NextResponse.json({
    instagramUrl: urls.NEXT_PUBLIC_INSTAGRAM_URL,
    xUrl: urls.NEXT_PUBLIC_X_URL,
    discordUrl: urls.NEXT_PUBLIC_DISCORD_URL,
    facebookUrl: urls.NEXT_PUBLIC_FACEBOOK_URL,
    youtubeUrl: urls.NEXT_PUBLIC_YOUTUBE_URL,
  });
}
