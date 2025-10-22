"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';
import type { DMConversation } from '@/types/live';
import PresenceDot from '@/components/live/indicators/PresenceDot';
import TypingIndicator from '@/components/live/indicators/TypingIndicator';
import MessageInput from '@/components/live/channel/MessageInput';
import UserAvatarMenu from '@/components/live/user/UserAvatarMenu';
import ReactionDisplay from '@/components/live/reactions/ReactionDisplay';
import MessageActionMenu from '@/components/live/message/MessageActionMenu';
import DMReplyIndicator from '@/components/live/message/DMReplyIndicator';
import ForwardIndicator from '@/components/live/message/ForwardIndicator';

interface DMMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      name: string;
      image: string | null;
    };
  } | null;
  sender: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  };
  receiver: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  };
}

interface DMConversationProps {
  conversation: DMConversation | null;
  messages: DMMessage[];
  onToggleDetails?: () => void;
  detailsOpen?: boolean;
  onSendMessage?: (content: string) => void;
  onUnsendMessage?: (messageId: string) => void;
  typingUsers?: Array<{ id: string; name: string }>;
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

export default function DMConversation({
  conversation,
  messages,
  onToggleDetails,
  detailsOpen,
  onSendMessage,
  onUnsendMessage,
  typingUsers = []
}: DMConversationProps) {
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(new Set());
  const [readTimeouts, setReadTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; image?: string | null; onlineStatus: 'online' | 'offline' | 'away' } | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DMMessage | null>(null);
  const [messageActionElement, setMessageActionElement] = useState<HTMLDivElement | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<DMMessage | null>(null); // New state for reply context
  const avatarRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (conversation && conversation.unreadCount > 0) {
      // TODO: Call API to mark messages as read
      fetch(`/api/live/dms/${conversation.id}`, { method: 'PATCH' }).catch(console.error);
    }
  }, [conversation]);

  // Mark messages as read when they've been visible for 1 second
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!conversation || messageIds.length === 0) return;

    try {
      const response = await fetch(`/api/live/dms/${conversation.id}/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageIds }),
      });

      if (response.ok) {

      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [conversation]);

  // Intersection Observer for scroll-based read tracking
  useEffect(() => {
    if (!conversation) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const messageId = entry.target.getAttribute('data-message-id');
          if (!messageId) return;

          if (entry.isIntersecting) {
            // Message is visible, start 1-second timer
            const timeout = setTimeout(() => {
              markMessagesAsRead([messageId]);
              setVisibleMessages(prev => new Set(prev).add(messageId));
            }, 1000);

            setReadTimeouts(prev => new Map(prev).set(messageId, timeout));
          } else {
            // Message is no longer visible, clear timeout
            const timeout = readTimeouts.get(messageId);
            if (timeout) {
              clearTimeout(timeout);
              setReadTimeouts(prev => {
                const newMap = new Map(prev);
                newMap.delete(messageId);
                return newMap;
              });
            }
          }
        });
      },
      {
        threshold: 0.5, // Message must be 50% visible
        rootMargin: '0px 0px -10% 0px', // Trigger when message is 10% from bottom
      }
    );

    // Observe all message elements
    messageRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      // Clear all timeouts
      readTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [conversation, messages, markMessagesAsRead, readTimeouts]);

  const handleAvatarClick = (user: { id: string; name: string; image?: string | null; onlineStatus: 'online' | 'offline' | 'away' }) => {
    setSelectedUser(user);
    setShowAvatarMenu(true);
  };

  const handleMessageClick = (message: DMMessage, element: HTMLDivElement) => {
    // For ALL messages (both own and others), show the MessageActionMenu
    setSelectedMessage(message);
    setMessageActionElement(element);
    setShowActionMenu(true);
  };

  const handleUnsend = async (messageId: string) => {
    if (onUnsendMessage) {
      onUnsendMessage(messageId);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  if (!conversation) {
    return (
      <section className="min-w-0 flex flex-col h-full bg-[color:var(--nav-bg)]/30 backdrop-blur-xl rounded-lg">
        <div className="h-12 px-4 backdrop-blur-md border-b border-border/20 flex items-center">
          <div className="text-[rgba(220,235,255,0.8)]">Select a conversation</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-[rgba(220,235,255,0.7)]">
            <p>Choose a conversation to start messaging</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 flex flex-col h-full bg-[color:var(--nav-bg)]/30 backdrop-blur-xl rounded-lg">
      {/* Header */}
      <div className="h-12 px-4 backdrop-blur-md border-b border-border/20 flex items-center">
        <div className="flex items-center gap-3 w-full">
          <div
            ref={avatarRef}
            className="relative cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleAvatarClick({
              id: conversation.otherUser.id,
              name: conversation.otherUser.name,
              image: conversation.otherUser.image,
              onlineStatus: conversation.otherUser.onlineStatus,
            })}
          >
            <Image
              src={conversation.otherUser.image || DEFAULT_AVATAR}
              alt={conversation.otherUser.name}
              width={32}
              height={32}
              className="rounded-full"
              unoptimized={!conversation.otherUser.image}
            />
            <PresenceDot
              status={conversation.otherUser.onlineStatus}
              size="sm"
              className="absolute -bottom-0.5 -right-0.5"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[rgba(236,245,255,0.95)]">
              {conversation.otherUser.name}
            </div>
            <div className="text-xs text-[rgba(220,235,255,0.7)]">
              {conversation.otherUser.onlineStatus === 'online' ? 'Online' :
               conversation.otherUser.onlineStatus === 'away' ? 'Away' : 'Offline'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleDetails?.()}
              aria-label={detailsOpen ? 'Hide details' : 'Show details'}
              title={detailsOpen ? 'Hide details' : 'Show details'}
              className="size-8 rounded-md hover:bg-white/5 ring-1 ring-transparent hover:ring-border/20 grid place-items-center"
            >
              {detailsOpen ? (
                <PanelRightClose className="w-4 h-4 text-[rgba(236,245,255,0.9)]" />
              ) : (
                <PanelRightOpen className="w-4 h-4 text-[rgba(236,245,255,0.9)]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message, index) => {
          const showDate = index === 0 ||
            new Date(message.createdAt).toDateString() !==
            new Date(messages[index - 1].createdAt).toDateString();

          return (
            <div key={message.id}>
              {showDate && (
                <div className="text-center py-4">
                  <div className="text-xs text-[rgba(220,235,255,0.5)] bg-[color:var(--nav-bg)]/50 px-3 py-1 rounded-full inline-block">
                    {formatDate(message.createdAt)}
                  </div>
                </div>
              )}

              <div
                ref={(el) => {
                  if (el) {
                    messageRefs.current.set(message.id, el);
                  }
                }}
                data-message-id={message.id}
                className={`flex items-start gap-3 group ${session?.user?.id === message.senderId ? 'flex-row-reverse justify-end' : ''}`}
              >
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleAvatarClick({
                    id: message.sender.id,
                    name: message.sender.name,
                    image: message.sender.image,
                    onlineStatus: 'offline', // We don't have online status in DMMessage
                  })}
                >
                  <Image
                    src={message.sender.image || DEFAULT_AVATAR}
                    alt={message.sender.name}
                    width={32}
                    height={32}
                    className="rounded-full flex-shrink-0"
                    unoptimized={!message.sender.image}
                  />
                </div>
                <div className={`min-w-0 flex-1 ${session?.user?.id === message.senderId ? 'text-right flex flex-col items-end' : ''}`}>
                  <div className={`flex items-center gap-2 ${session?.user?.id === message.senderId ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-[rgba(236,245,255,0.95)]">
                      {message.sender.name}
                    </span>
                    <span className="text-xs text-[rgba(220,235,255,0.7)]">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>

                  {/* Reply Indicator */}
                  {message.replyTo && (
                    <DMReplyIndicator
                      replyTo={message.replyTo}
                      isOwnMessage={session?.user?.id === message.senderId}
                    />
                  )}

                  {/* Forward Indicator - detect our forwarded meta by convention */}
                  {message.content.startsWith('Forwarded from ') && (
                    <ForwardIndicator
                      meta={{
                        authorName: message.content.split('Forwarded from ')[1]?.split(' • ')[0] || 'User',
                        location: message.content.split(' • ')[1]?.trim() || '',
                        time: message.content.split(' • ')[2]?.split('\n')[0] || '',
                        preview: message.content.split('\n').slice(1).join('\n')
                      }}
                      isOwnMessage={session?.user?.id === message.senderId}
                    />
                  )}

                  <div className={`flex flex-col gap-1 ${session?.user?.id === message.senderId ? 'items-end' : ''}`}>
                    <div
                      className={`relative text-[rgba(220,235,255,0.9)] whitespace-pre-wrap break-words cursor-pointer transition-all duration-200 max-w-fit ${
                        message.content.startsWith('Forwarded from ')
                          ? session?.user?.id === message.senderId
                            ? 'bg-gradient-to-br from-blue-500/25 to-blue-600/15 rounded-2xl px-4 py-3 inline-block hover:from-blue-500/30 hover:to-blue-600/20 shadow-lg border border-blue-400/20'
                            : 'bg-gradient-to-br from-gray-500/25 to-gray-600/15 rounded-2xl px-4 py-3 inline-block hover:from-gray-500/30 hover:to-gray-600/20 shadow-lg border border-gray-400/20'
                          : session?.user?.id === message.senderId
                            ? 'bg-blue-500/20 rounded-lg px-3 py-2 inline-block hover:bg-blue-500/30'
                            : 'bg-gray-600/20 rounded-lg px-3 py-2 inline-block hover:bg-gray-600/30'
                      }`}
                      onClick={(e) => handleMessageClick(message, e.currentTarget)}
                    >
                      {message.content.startsWith('Forwarded from ')
                        ? message.content.split('\n').slice(1).join('\n')
                        : message.content}
                    </div>

                    {/* Reactions - DM */}
                    <ReactionDisplay
                      messageId={message.id}
                      messageType="dm"
                      isOwnMessage={session?.user?.id === message.senderId}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {onSendMessage && (
        <MessageInput
          onSendMessage={onSendMessage}
          replyContext={replyToMessage ? {
            message: {
              id: replyToMessage.id,
              content: replyToMessage.content,
              authorName: replyToMessage.sender.name,
              authorImage: replyToMessage.sender.image,
            },
            onCancel: () => setReplyToMessage(null),
          } : undefined}
        />
      )}

      {/* Avatar Menu */}
      {selectedUser && (
        <UserAvatarMenu
          user={selectedUser}
          isOpen={showAvatarMenu}
          onClose={() => {
            setShowAvatarMenu(false);
            setSelectedUser(null);
          }}
          anchorRef={avatarRef}
        />
      )}

      {/* Message Action Menu */}
      {selectedMessage && (
        <MessageActionMenu
          messageId={selectedMessage.id}
          messageType="dm"
          isOpen={showActionMenu}
          onClose={() => {
            setShowActionMenu(false);
            setSelectedMessage(null);
          }}
          onReply={(message) => {
            // Find the actual message object to set as reply context
            const actualMessage = messages.find(m => m.id === message.id);
            if (actualMessage) {
              setReplyToMessage(actualMessage);
            }
          }}
          onForward={(message) => {
            // TODO: Implement forward functionality

          }}
          onUnsend={() => handleUnsend(selectedMessage.id)}
          anchorRef={{ current: messageActionElement }}
          isOwnMessage={session?.user?.id === selectedMessage.senderId}
          message={{
            id: selectedMessage.id,
            content: selectedMessage.content,
            authorName: selectedMessage.sender.name,
            authorImage: selectedMessage.sender.image,
          }}
        />
      )}
    </section>
  );
}
