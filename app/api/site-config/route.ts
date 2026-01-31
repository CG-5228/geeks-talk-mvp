import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Public site config (e.g. social links). Read from server env at request time
 * so production uses /var/www/geekstalk/shared/.env instead of build-time values.
 */

// Cache for loaded env values
let envCache: Record<string, string> | null = null;

// Explicitly load .env file and return parsed values
function loadEnvFile(): Record<string, string> {
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
        break; // Stop after first found file
      } catch (e) {
        // Ignore read errors
      }
    }
  }
  
  envCache = result;
  return result;
}

function getEnv(key: string): string {
  // First check process.env
  if (process.env[key]) {
    return process.env[key]!;
  }
  // Then check loaded env file
  const loaded = loadEnvFile();
  return loaded[key] || '#';
}

export async function GET() {
  const config = {
    instagramUrl: getEnv('NEXT_PUBLIC_INSTAGRAM_URL'),
    xUrl: getEnv('NEXT_PUBLIC_X_URL'),
    discordUrl: getEnv('NEXT_PUBLIC_DISCORD_URL'),
    facebookUrl: getEnv('NEXT_PUBLIC_FACEBOOK_URL'),
    youtubeUrl: getEnv('NEXT_PUBLIC_YOUTUBE_URL'),
  };
  return NextResponse.json(config);
}

// Debug endpoint - add ?debug=1 to see what's happening
export async function POST() {
  const envPaths = [
    '/var/www/geekstalk/shared/.env',
    '/var/www/geekstalk/current/.env',
    resolve(process.cwd(), '.env'),
  ];
  
  const debug: Record<string, unknown> = {
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    envPaths: envPaths.map(p => ({ path: p, exists: existsSync(p) })),
    processEnvKeys: Object.keys(process.env).filter(k => k.includes('INSTAGRAM') || k.includes('PUBLIC')),
    loadedEnv: loadEnvFile(),
  };
  
  return NextResponse.json(debug);
}
