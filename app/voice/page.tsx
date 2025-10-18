"use client";
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import VoiceChannelList from '@/components/voice/VoiceChannelList';
import RandomQueue from '@/components/voice/RandomQueue';

export default function VoicePage() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<'base' | 'random'>('base');

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">Sign in required</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to access voice chat.</p>
          <a
            href="/signin"
            className="btn-primary rounded-full px-6 py-2 inline-block"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/20 bg-card/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Voice Chat</h1>
            
            {/* Mode Toggle */}
            <div className="flex items-center bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setMode('base')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'base'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Base Chat
              </button>
              <button
                onClick={() => setMode('random')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'random'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Random Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {mode === 'base' ? (
          <VoiceChannelList />
        ) : (
          <RandomQueue />
        )}
      </div>
    </div>
  );
}
