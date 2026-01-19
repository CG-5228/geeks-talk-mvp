"use client";

import { useState, useEffect, useRef } from 'react';
import { RemoteParticipant, LocalParticipant } from 'livekit-client';
import { Send, Users, MessageSquare, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { ParticipantState } from './useVideoRoom';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

interface VideoChatSidebarProps {
  participants: ParticipantState[];
  localParticipant: ParticipantState | null;
  roomName: string;
  className?: string;
}

export default function VideoChatSidebar({
  participants,
  localParticipant,
  roomName,
  className = '',
}: VideoChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<any>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up data channel for chat messages
  useEffect(() => {
    // This would be set up when the room is connected
    // For now, we'll use a simple local state
    // In a real implementation, you'd use LiveKit's data channel
  }, [roomName]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !localParticipant) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: localParticipant.participant.identity,
      userName: (localParticipant.participant as LocalParticipant).name || 'You',
      message: messageInput.trim(),
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessageInput('');

    // In a real implementation, send via LiveKit data channel
    // roomRef.current?.localParticipant.publishData(JSON.stringify(newMessage), { reliable: true });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const allParticipants = localParticipant
    ? [localParticipant, ...participants]
    : participants;

  return (
    <div className={`flex flex-col bg-[#1a1b23] border-l border-white/20 ${className}`}>
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'participants'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            <span>Participants ({allParticipants.length})</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chat' ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-white/50 text-sm mt-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.userId === localParticipant?.participant.identity
                        ? 'items-end'
                        : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white/70">{msg.userName}</span>
                      <span className="text-xs text-white/50">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.userId === localParticipant?.participant.identity
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Participants List */
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {allParticipants.map((participantState) => {
              const isLocal = participantState.participant.identity === localParticipant?.participant.identity;
              const participant = participantState.participant;
              const name = isLocal
                ? 'You'
                : (participant as RemoteParticipant).name || participant.identity || 'Unknown';

              return (
                <div
                  key={participant.identity}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{name}</div>
                    {isLocal && (
                      <div className="text-xs text-blue-400">(You)</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {participantState.isVideoEnabled ? (
                      <Video className="w-4 h-4 text-green-400" />
                    ) : (
                      <VideoOff className="w-4 h-4 text-red-400" />
                    )}
                    {participantState.isAudioEnabled ? (
                      <Mic className="w-4 h-4 text-green-400" />
                    ) : (
                      <MicOff className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
