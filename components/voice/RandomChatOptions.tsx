"use client";

import { useState } from 'react';
import { Users, User } from 'lucide-react';

interface RandomChatOptionsProps {
  onSelectOneOnOne: () => void;
  onSelectGroupChat: () => void;
}

export default function RandomChatOptions({ 
  onSelectOneOnOne, 
  onSelectGroupChat
}: RandomChatOptionsProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Random Chat</h2>
        <p className="text-muted-foreground">
          Choose your preferred chat type to get matched with other users.
        </p>
      </div>

      {/* Chat Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* One-on-One Option */}
        <button
          onClick={onSelectOneOnOne}
          className="group p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] hover:border-primary/30"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">One-on-One</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get matched with one person for a private conversation. Perfect for focused discussions.
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Topic-based matching</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Quick matching</span>
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* Group Chat Option */}
        <button
          onClick={onSelectGroupChat}
          className="group p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] hover:border-primary/30"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Group Chat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Join a group conversation with 3-4 people. Great for diverse discussions and networking.
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>3-4 participants</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Topic-based matching</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Longer wait time</span>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>


      {/* Features Comparison */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-medium text-foreground mb-2">Smart Matching</h4>
          <p className="text-sm text-muted-foreground">
            Get matched based on your interests and preferences
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-medium text-foreground mb-2">Secure & Private</h4>
          <p className="text-sm text-muted-foreground">
            Your conversations are protected with encryption
          </p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-medium text-foreground mb-2">Quick Connect</h4>
          <p className="text-sm text-muted-foreground">
            Start chatting within seconds of matching
          </p>
        </div>
      </div>
    </div>
  );
}
