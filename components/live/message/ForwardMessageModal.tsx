"use client";
import { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface ForwardMessageModalProps {
  message: {
    id: string;
    content: string;
    authorName: string;
    authorImage?: string | null;
  };
  messageType: 'channel' | 'dm';
  onClose: () => void;
  onForward: (destinations: string[]) => Promise<void>;
}

interface Channel {
  id: string;
  name: string;
  slug: string;
}

interface DMConversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export default function ForwardMessageModal({ 
  message, 
  messageType, 
  onClose, 
  onForward 
}: ForwardMessageModalProps) {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      // Fetch channels
      const channelsResponse = await fetch('/api/live/channels');
      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json();
        setChannels(channelsData.channels || []);
      }

      // Fetch DM conversations
      const dmsResponse = await fetch('/api/live/dms');
      if (dmsResponse.ok) {
        const dmsData = await dmsResponse.json();
        setDmConversations(dmsData.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDestinationToggle = (destinationId: string) => {
    setSelectedDestinations(prev => 
      prev.includes(destinationId) 
        ? prev.filter(id => id !== destinationId)
        : [...prev, destinationId]
    );
  };

  const handleForward = async () => {
    if (selectedDestinations.length === 0) {
      alert('Please select at least one destination');
      return;
    }

    setForwarding(true);
    try {
      await onForward(selectedDestinations);
      onClose();
    } catch (error) {
      console.error('Error forwarding message:', error);
      alert('Failed to forward message');
    } finally {
      setForwarding(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[color:var(--nav-bg)] border border-border/20 rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="p-6 text-center">
            <div className="text-[rgba(220,235,255,0.7)]">Loading destinations...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[color:var(--nav-bg)] border border-border/20 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-[rgba(220,235,255,0.9)]">
              Forward Message
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b border-border/20">
          <div className="bg-gray-700/30 border-l-4 border-blue-500 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-blue-400 font-medium">Forwarding from</span>
              <span className="text-xs text-[rgba(220,235,255,0.8)]">{message.authorName}</span>
            </div>
            <p className="text-sm text-[rgba(220,235,255,0.7)]">
              {message.content}
            </p>
          </div>
        </div>

        {/* Destinations */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {/* Channels */}
            {channels.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[rgba(220,235,255,0.8)] mb-2">
                  Channels
                </h3>
                <div className="space-y-1">
                  {channels.map((channel) => (
                    <label
                      key={channel.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDestinations.includes(channel.id)}
                        onChange={() => handleDestinationToggle(channel.id)}
                        className="w-4 h-4 text-blue-500 bg-transparent border border-white/20 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-[rgba(220,235,255,0.9)]">
                        #{channel.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* DM Conversations */}
            {dmConversations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[rgba(220,235,255,0.8)] mb-2">
                  Direct Messages
                </h3>
                <div className="space-y-1">
                  {dmConversations.map((conversation) => (
                    <label
                      key={conversation.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDestinations.includes(conversation.otherUser.id)}
                        onChange={() => handleDestinationToggle(conversation.otherUser.id)}
                        className="w-4 h-4 text-blue-500 bg-transparent border border-white/20 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-[rgba(220,235,255,0.9)]">
                        {conversation.otherUser.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {channels.length === 0 && dmConversations.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-[rgba(220,235,255,0.6)]">
                  No destinations available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-border/20">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-[rgba(220,235,255,0.7)] bg-white/5 hover:bg-white/10 rounded-md transition-colors"
            disabled={forwarding}
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={forwarding || selectedDestinations.length === 0}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {forwarding ? 'Forwarding...' : `Forward to ${selectedDestinations.length} destination${selectedDestinations.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}