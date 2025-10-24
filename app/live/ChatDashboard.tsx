"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Conversation from '@/components/live/channel/Conversation';
import MessageInput from '@/components/live/channel/MessageInput';
import ConversationDetails from '@/components/live/components/ConversationDetails';
import DMDetails from '@/components/live/dm/DMDetails';
import ChatsSidebar from '@/components/live/shell/ChatsSidebar';
import ServerRail from '@/components/live/shell/ServerRail';
import DMConversation from '@/components/live/dm/DMConversation';
import CreateChannelModal from '@/components/live/CreateChannelModal';
import type { Channel, LiveMessage, DMConversation as DMConversationType } from '@/types/live';

export default function ChatDashboard() {
  const { data: session, status } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [active, setActive] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  // DM state
  const [dmConversations, setDMConversations] = useState<DMConversationType[]>([]);
  const [activeDM, setActiveDM] = useState<DMConversationType | null>(null);
  const [dmMessages, setDMMessages] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'channel' | 'dm'>('channel');
  const [sidebarView, setSidebarView] = useState<'channels' | 'dms'>('channels');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    // Fetch channels
    fetch('/api/live/channels').then(r => r.json()).then((data) => {

      const pub = data.public as Channel[];
      const privateOwned = data.privateOwned as Channel[];
      // Combine public and private channels
      const allChannels = [...pub, ...privateOwned];

      setChannels(allChannels);
      setActive(allChannels[0] ?? null);
    }).catch((error) => {
      console.error('Error fetching channels:', error);
    });

    // Fetch DM conversations
    fetch('/api/live/dms').then(r => r.json()).then((data) => {

      setDMConversations(data.conversations || []);
    }).catch((error) => {
      console.error('Error loading DM conversations:', error);
      // For development/testing, you can uncomment the line below to add mock data
      // setDMConversations([]);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    fetch(`/api/live/messages?channel=${encodeURIComponent(active.id)}&limit=50`)
      .then(r => r.json())
      .then((data) => setMessages((data.messages || []) as LiveMessage[]))
      .catch(() => setMessages([]));
  }, [active?.id]);

  useEffect(() => {
    if (!activeDM) return;
    fetch(`/api/live/dms/${activeDM.id}`)
      .then(r => r.json())
      .then((data) => setDMMessages(data.messages || []))
      .catch(() => setDMMessages([]));
  }, [activeDM?.id]);

  // Poll for new messages in real-time
  useEffect(() => {
    if (active) {
      const pollInterval = setInterval(() => {
        fetch(`/api/live/messages?channel=${encodeURIComponent(active.id)}&limit=50`)
          .then(r => r.json())
          .then((data) => {
            const newMessages = (data.messages || []) as LiveMessage[];
            setMessages(prev => {
              // Check if messages have actually changed
              if (prev.length !== newMessages.length ||
                  prev[prev.length - 1]?.id !== newMessages[newMessages.length - 1]?.id) {
                return newMessages;
              }
              return prev;
            });
          })
          .catch(() => {}); // Silent fail for polling
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(pollInterval);
    }
  }, [active?.id]);

  // Poll for new DM messages in real-time
  useEffect(() => {
    if (activeDM) {
      const pollInterval = setInterval(() => {
        fetch(`/api/live/dms/${activeDM.id}`)
          .then(r => r.json())
          .then((data) => {
            const newMessages = data.messages || [];
            setDMMessages(prev => {
              // Check if messages have actually changed
              if (prev.length !== newMessages.length ||
                  prev[prev.length - 1]?.id !== newMessages[newMessages.length - 1]?.id) {
                return newMessages;
              }
              return prev;
            });
          })
          .catch(() => {}); // Silent fail for polling
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(pollInterval);
    }
  }, [activeDM?.id]);

  const handleUnsendMessage = async (messageId: string, messageType: 'channel' | 'dm') => {
    try {
      const endpoint = messageType === 'channel'
        ? `/api/live/messages/${messageId}`
        : `/api/live/dms/message/${messageId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Optimistically remove the message from UI
        if (messageType === 'channel') {
          setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } else {
          setDMMessages(prev => prev.filter(msg => msg.id !== messageId));
        }

      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to unsend message');
      }
    } catch (error) {
      console.error('Failed to unsend message:', error);
      alert('Failed to unsend message');
    }
  };

  const handleSendMessage = async (text: string, replyToId?: string) => {
    if (viewMode === 'channel' && active) {
      // Find the message being replied to for optimistic UI
      let replyToData = null;
      if (replyToId) {
        const repliedMessage = messages.find(m => m.id === replyToId);
        if (repliedMessage) {
          replyToData = {
            id: repliedMessage.id,
            content: repliedMessage.content,
            authorName: repliedMessage.authorName,
            authorImage: repliedMessage.authorImage,
          };
        }
      }

      const optimistic: LiveMessage = {
        id: `tmp-${Math.random().toString(36).slice(2)}`,
        channelId: active.id,
        authorId: session?.user?.id || 'unknown',
        authorName: session?.user?.name || 'You',
        authorImage: session?.user?.image || null,
        content: text,
        type: 'text',
        createdAt: new Date().toISOString(),
        replyToId: replyToId,
        replyTo: replyToData,
      };
      setMessages(prev => [...prev, optimistic]);
      try {

        const res = await fetch('/api/live/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': document.cookie // Ensure cookies are sent
          },
          credentials: 'include', // Include credentials
          body: JSON.stringify({ channelId: active.id, content: text, replyToId })
        });

        if (res.ok) {
          const created = await res.json();

          // Preserve reply context if API doesn't hydrate it
          const createdWithReply = {
            ...created,
            replyToId: created.replyToId ?? optimistic.replyToId,
            replyTo: created.replyTo ?? optimistic.replyTo,
          } as LiveMessage;
          setMessages(prev => prev.map(m => m.id === optimistic.id ? createdWithReply : m));
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Failed to send message' }));
          console.error('Failed to send message:', errorData);
          // Keep the message but mark it as failed
          setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, content: `${m.content} (Failed to send)` } : m));
        }
      } catch (error) {
        console.error('Network error sending message:', error);
        // Keep the message but mark it as failed
        setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, content: `${m.content} (Network error)` } : m));
      }
    } else if (viewMode === 'dm' && activeDM) {
      // Find the message being replied to for optimistic UI
      let replyToData = null;
      if (replyToId) {
        const repliedMessage = dmMessages.find(m => m.id === replyToId);
        if (repliedMessage) {
          replyToData = {
            id: repliedMessage.id,
            content: repliedMessage.content,
            sender: {
              id: repliedMessage.sender.id,
              name: repliedMessage.sender.name,
              image: repliedMessage.sender.image,
            },
          };
        }
      }

      const optimisticDM = {
        id: `tmp-dm-${Math.random().toString(36).slice(2)}`,
        conversationId: activeDM.id,
        senderId: session?.user?.id || 'unknown',
        receiverId: activeDM.otherUser.id,
        content: text,
        read: false,
        createdAt: new Date().toISOString(),
        replyToId: replyToId,
        replyTo: replyToData,
        sender: {
          id: session?.user?.id || 'unknown',
          name: session?.user?.name || 'You',
          username: 'you',
          image: session?.user?.image || null
        },
        receiver: activeDM.otherUser
      };
      setDMMessages(prev => [...prev, optimisticDM]);

      try {
        const res = await fetch('/api/live/dms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': document.cookie // Ensure cookies are sent
          },
          credentials: 'include', // Include credentials
          body: JSON.stringify({ receiverId: activeDM.otherUser.id, content: text, replyToId })
        });
        if (res.ok) {
          const created = await res.json();
          // Preserve reply context if API doesn't hydrate it yet
          const createdWithReply = {
            ...created,
            replyToId: created.replyToId ?? optimisticDM.replyToId,
            replyTo: created.replyTo ?? optimisticDM.replyTo,
          };
          setDMMessages(prev => prev.map(m => m.id === optimisticDM.id ? createdWithReply : m));
          // Refresh DM conversations to update last message
          fetch('/api/live/dms').then(r => r.json()).then((data) => {
            setDMConversations(data.conversations || []);
          }).catch(() => {});
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Failed to send DM' }));
          console.error('Failed to send DM:', errorData);
          // Keep the message but mark it as failed
          setDMMessages(prev => prev.map(m => m.id === optimisticDM.id ? { ...m, content: `${m.content} (Failed to send)` } : m));
        }
      } catch (error) {
        console.error('Network error sending DM:', error);
        // Keep the message but mark it as failed
        setDMMessages(prev => prev.map(m => m.id === optimisticDM.id ? { ...m, content: `${m.content} (Network error)` } : m));
      }
    }
  };

  const handleSelectChannel = (channel: Channel) => {
    setActive(channel);
    setActiveDM(null);
    setViewMode('channel');
  };

  const handleSelectDM = (conversationId: string) => {
    const conversation = dmConversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveDM(conversation);
      setActive(null);
      setViewMode('dm');
      setShowDetails(true); // Auto-open details panel for DMs
    }
  };

  const handleShowFriends = () => {
    setViewMode('dm');
    setActiveDM(null);
    setActive(null);
    setShowDetails(true);
  };

  const handleStartDM = async (userId: string) => {
    try {

      const res = await fetch('/api/live/dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId, content: 'Hello!' })
      });

      if (res.ok) {

        // Refresh DM conversations
        const refreshRes = await fetch('/api/live/dms');
        if (refreshRes.ok) {
          const data = await refreshRes.json();

          setDMConversations(data.conversations || []);

          // Auto-select the new conversation
          const newConversation = data.conversations?.find((c: any) =>
            c.otherUser.id === userId
          );

          if (newConversation) {

            setActiveDM(newConversation);
            setActive(null);
            setViewMode('dm');
            setShowDetails(true);

            // Also switch to DM view in sidebar
            setSidebarView('dms');
          } else {

            // Fallback: just switch to DM view
            setViewMode('dm');
            setSidebarView('dms');
            setShowDetails(true);
          }
        }
      } else {
        const errorData = await res.json();
        console.error('Failed to create DM:', errorData);
      }
    } catch (error) {
      console.error('Failed to start DM:', error);
    }
  };

  const handleSidebarViewChange = (view: 'channels' | 'dms') => {
    setSidebarView(view);
    // Clear active selections when switching views
    if (view === 'channels') {
      setActiveDM(null);
      setViewMode('channel');
      // Select first channel if none selected
      if (!active && channels.length > 0) {
        setActive(channels[0]);
      }
    } else {
      setActive(null);
      setViewMode('dm');
      // Select first DM if available
      if (dmConversations.length > 0) {
        setActiveDM(dmConversations[0]);
        setShowDetails(true);
      }
    }
  };

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="h-[calc(100vh-var(--header-h)-8px)] flex items-center justify-center">
        <div className="text-[rgba(220,235,255,0.8)]">Loading...</div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="h-[calc(100vh-var(--header-h)-8px)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[rgba(236,245,255,0.95)] mb-2">Sign in required</h2>
          <p className="text-[rgba(220,235,255,0.8)] mb-4">You need to be signed in to use the chat.</p>
          <a
            href="/signin"
            className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--header-h)-8px)] min-h-0 overflow-hidden">
      <div className="grid h-full grid-cols-[72px_var(--sidebar,320px)_minmax(0,1fr)_auto] transition-[grid-template-columns] duration-300">
        {/* Left: Server Rail */}
        <div className="overflow-hidden hidden lg:block">
          <ServerRail onViewChange={handleSidebarViewChange} />
        </div>

        {/* Left-Center: Sidebar with Channels and DMs */}
        <div className="border-r border-border/20 overflow-hidden hidden md:block">
          <ChatsSidebar
            channels={channels}
            activeId={viewMode === 'channel' ? active?.id ?? null : null}
            counts={{}}
            onSelect={handleSelectChannel}
            onCreate={async (name: string, description?: string) => {
              try {

                const res = await fetch('/api/live/channels', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, description })
                });

                if (res.ok) {
                  const newChannel = await res.json();

                  // Refresh the entire channels list to ensure we have the latest data
                  const channelsRes = await fetch('/api/live/channels');
                  if (channelsRes.ok) {
                    const channelsData = await channelsRes.json();
                    const pub = channelsData.public as Channel[];
                    const privateOwned = channelsData.privateOwned as Channel[];
                    const allChannels = [...pub, ...privateOwned];
                    setChannels(allChannels);

                    // Find and select the newly created channel
                    const createdChannel = allChannels.find(c => c.id === newChannel.id);
                    if (createdChannel) {
                      setActive(createdChannel);
                      setViewMode('channel');
                      setSidebarView('channels');
                    }
                  }
                } else {
                  const errorData = await res.json();
                  console.error('Failed to create channel:', errorData);
                  alert(`Failed to create channel: ${errorData.error || 'Unknown error'}`);
                }
              } catch (error) {
                console.error('Failed to create channel:', error);
              }
            }}
            dmConversations={dmConversations}
            activeDMId={viewMode === 'dm' ? activeDM?.id ?? null : null}
            onSelectDM={handleSelectDM}
            onStartDM={handleStartDM}
            onShowFriends={handleShowFriends}
            sidebarView={sidebarView}
            onShowCreateModal={() => setShowCreateModal(true)}
            onDeleteChannel={async (channelId: string) => {
              try {
                const res = await fetch(`/api/live/channels/${channelId}`, {
                  method: 'DELETE',
                });
                if (res.ok) {

                  // Refresh the entire channels list from the database
                  const channelsRes = await fetch('/api/live/channels');
                  if (channelsRes.ok) {
                    const channelsData = await channelsRes.json();
                    const pub = channelsData.public as Channel[];
                    const privateOwned = channelsData.privateOwned as Channel[];
                    const allChannels = [...pub, ...privateOwned];
                    setChannels(allChannels);

                    // If the deleted channel was active, select the first available channel
                    if (active?.id === channelId) {
                      setActive(allChannels[0] || null);
                    }
                  }
                } else {
                  const errorData = await res.json();
                  console.error('Failed to delete channel:', errorData);
                  alert(`Failed to delete channel: ${errorData.error || 'Unknown error'}`);
                }
              } catch (error) {
                console.error('Error deleting channel:', error);
                alert('Error deleting channel.');
              }
            }}
          />
        </div>

        {/* Center: MessageThread + Input */}
        <div className="overflow-hidden min-w-0 min-h-0 flex flex-col p-2">
          {viewMode === 'channel' ? (
            <>
              <Conversation
                channel={active}
                messages={messages}
                onToggleDetails={() => setShowDetails((v) => !v)}
                detailsOpen={showDetails}
                onUnsendMessage={(messageId) => handleUnsendMessage(messageId, 'channel')}
              />
              {active && (
                <MessageInput onSendMessage={handleSendMessage} channelId={active.id} />
              )}
            </>
          ) : (
            <>
              <DMConversation
                conversation={activeDM}
                messages={dmMessages}
                onToggleDetails={() => setShowDetails((v) => !v)}
                detailsOpen={showDetails}
                onSendMessage={handleSendMessage}
                onUnsendMessage={(messageId) => handleUnsendMessage(messageId, 'dm')}
              />
            </>
          )}
        </div>

        {/* Right: ConversationDetails or DMDetails (collapsible width) */}
        <div
          className={`overflow-hidden border-l transition-[width,opacity] duration-300 ${showDetails ? 'w-80 opacity-100 border-border/20' : 'w-0 opacity-0 pointer-events-none border-transparent'}`}
        >
          {showDetails && (
            viewMode === 'channel' ? (
              <ConversationDetails
                conversation={active}
                onClose={() => setShowDetails(false)}
              />
            ) : (
              <DMDetails
                conversation={activeDM}
                onClose={() => setShowDetails(false)}
                onStartDM={handleStartDM}
              />
            )
          )}
        </div>
      </div>

      {/* Create Channel Modal */}
      <CreateChannelModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={async (settings) => {
          try {
            const res = await fetch('/api/live/channels', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: settings.name, description: settings.description })
            });
            if (res.ok) {
              const newChannel = await res.json();

              // Refresh the entire channels list to ensure we have the latest data
              const channelsRes = await fetch('/api/live/channels');
              if (channelsRes.ok) {
                const channelsData = await channelsRes.json();
                const pub = channelsData.public as Channel[];
                const privateOwned = channelsData.privateOwned as Channel[];
                const allChannels = [...pub, ...privateOwned];
                setChannels(allChannels);

                // Find and select the newly created channel
                const createdChannel = allChannels.find(c => c.id === newChannel.id);
                if (createdChannel) {
                  setActive(createdChannel);
                  setViewMode('channel');
                  setSidebarView('channels');
                }
              }
              setShowCreateModal(false);
            }
          } catch (error) {
            console.error('Failed to create channel:', error);
          }
        }}
      />
    </div>
  );
}

// Note: Slide-over removed for ChatDashboard (details lives in grid right pane)
