"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ReactionDisplayProps {
  messageId: string;
  messageType: 'channel' | 'dm';
  isOwnMessage?: boolean;
}

interface Reaction {
  emoji: string;
  count: number;
  users: Array<{
    id: string;
    name: string;
    image?: string | null;
  }>;
}

export default function ReactionDisplay({ messageId, messageType, isOwnMessage = false }: ReactionDisplayProps) {
  const { data: session } = useSession();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  useEffect(() => {
    fetchReactions();
  }, [messageId, messageType]);

  useEffect(() => {
    // Set up polling for real-time reaction updates
    const pollInterval = setInterval(() => {
      fetchReactions();
    }, 1000); // Poll every 1 second for more real-time feel

    return () => {
      clearInterval(pollInterval);
    };
  }, [messageId, messageType]);

  const fetchReactions = async () => {
    try {
      const endpoint = messageType === 'channel'
        ? `/api/live/messages/${messageId}/reactions`
        : `/api/live/dms/message/${messageId}/reactions`;

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setReactions(data.reactions || []);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactionClick = async (emoji: string) => {
    if (!session?.user?.id) return;

    try {
      const endpoint = messageType === 'channel'
        ? `/api/live/messages/${messageId}/reactions`
        : `/api/live/dms/message/${messageId}/reactions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        // Refresh reactions
        fetchReactions();
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  if (loading) {
    return null;
  }

  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {reactions.map((reaction) => {
        const hasUserReacted = reaction.users.some(user => user.id === session?.user?.id);
        
        return (
          <div key={reaction.emoji} className="relative">
            <button
              onClick={() => handleReactionClick(reaction.emoji)}
              onMouseEnter={() => setHoveredReaction(reaction.emoji)}
              onMouseLeave={() => setHoveredReaction(null)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                hasUserReacted
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-sm">{reaction.emoji}</span>
              <span className={`text-xs ${
                hasUserReacted 
                  ? 'text-blue-300' 
                  : 'text-[rgba(220,235,255,0.7)]'
              }`}>
                {reaction.count}
              </span>
            </button>
            
            {/* Hover Tooltip */}
            {hoveredReaction === reaction.emoji && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                <div className="bg-black/90 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-white/10 min-w-max">
                  <div className="flex flex-col gap-1">
                    {reaction.users.map((user, index) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <span className="text-sm">{reaction.emoji}</span>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    ))}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}