"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import GroupList from './GroupList';
import { Channel } from '@/types/live';

export default function VoiceChannelList() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/live/channels');
      if (response.ok) {
        const data = await response.json();
        // Combine public and private channels
        const allChannels = [
          ...(data.public || []),
          ...(data.privateOwned || [])
        ];
        setChannels(allChannels);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (selectedChannel) {
    return (
      <GroupList 
        channelId={selectedChannel}
        onBack={() => setSelectedChannel(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Select a Channel</h2>
        <p className="text-muted-foreground">
          Choose a channel to join voice groups and start collaborating.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => setSelectedChannel(channel.id)}
            className="p-6 rounded-xl border border-border/20 bg-card/95 backdrop-blur-xl hover:bg-card/100 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                #{channel.name}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {channel.category}
              </span>
            </div>
            
            {channel.topic && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {channel.topic}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="capitalize">{channel.category}</span>
              <span className="capitalize">{channel.visibility}</span>
            </div>
          </div>
        ))}
      </div>

      {channels.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No channels available</h3>
          <p className="text-muted-foreground">
            Create a channel in the text chat to start voice conversations.
          </p>
        </div>
      )}
    </div>
  );
}
