"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Mic, MicOff, PhoneOff, Users } from 'lucide-react';
import VoiceCanvas from './VoiceCanvas';

interface GroupRoomProps {
  groupId: string;
  onLeave: () => void;
}

export default function GroupRoom({ groupId, onLeave }: GroupRoomProps) {
  const { data: session } = useSession();
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    // TODO: Initialize LiveKit connection
    // TODO: Set up real-time member updates
    // TODO: Set up speaking indicators
  }, [groupId]);

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    // TODO: Toggle microphone in LiveKit
  };

  const handleLeave = async () => {
    try {
      await fetch(`/api/voice/groups/${groupId}/leave`, {
        method: 'POST',
      });
      onLeave();
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/20 bg-card/95 backdrop-blur-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onLeave}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Voice Group</h2>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''} online
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleMuteToggle}
              className={`p-3 rounded-full transition-colors ${
                isMuted 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleLeave}
              className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Canvas Area (Center) */}
        <div className="flex-1 p-6">
          <div className="h-full rounded-xl border border-border/20 bg-card/95 backdrop-blur-xl">
            <VoiceCanvas groupId={groupId} />
          </div>
        </div>

        {/* Members Sidebar (Right) */}
        <div className="w-80 border-l border-border/20 bg-card/95 backdrop-blur-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Members</h3>
          
          <div className="space-y-3">
            {members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No members yet</p>
              </div>
            ) : (
              members.map((member) => {
                const isCurrentUser = member.userId === session?.user?.id;
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {member.user.image ? (
                          <img
                            src={member.user.image}
                            alt={member.user.name || member.user.username || 'User'}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            {(member.user.name || member.user.username || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {member.isSpeaking && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.user.name || member.user.username || 'Anonymous'}
                        {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.isSpeaking ? 'Speaking' : 'Listening'}
                      </p>
                    </div>
                    
                    {/* Only show three-dots menu for other users, not current user */}
                    {!isCurrentUser && (
                      <button className="p-1 rounded hover:bg-white/10 transition-colors">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="border-t border-border/20 bg-card/95 backdrop-blur-xl p-4">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Connected</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Push to talk: {isMuted ? 'Off' : 'On'}
          </div>
        </div>
      </div>
    </div>
  );
}
