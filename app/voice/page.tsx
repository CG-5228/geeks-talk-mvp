"use client";
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import VoiceChannelList from '@/components/voice/VoiceChannelList';
import RandomQueue from '@/components/voice/RandomQueue';

export default function VoiceChatPage() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<'base' | 'random'>('base');

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d9ff]"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">Sign in required</h1>
          <p className="text-white/70 mb-6">You need to be signed in to access voice chat.</p>
          <a
            href="/signin"
            className="px-6 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 hover:shadow-[0_0_10px_rgba(0,217,255,0.2)] transition-all duration-200 inline-block"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d]">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">Voice Chat</h1>
            
            {/* Mode Toggle */}
            <div className="flex items-center bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setMode('base')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'base'
                    ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Base Chat
              </button>
              <button
                onClick={() => setMode('random')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'random'
                    ? 'bg-[#b537ff]/20 text-[#b537ff] border border-[#b537ff]/30'
                    : 'text-white/70 hover:text-white'
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