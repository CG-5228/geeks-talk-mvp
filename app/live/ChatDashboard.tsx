"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Conversation from '@/components/live/channel/Conversation';
import MessageInput from '@/components/live/channel/MessageInput';
import ConversationDetails from '@/components/live/components/ConversationDetails';
import DMDetails from '@/components/live/dm/DMDetails';
import ChatsSidebar from '@/components/live/shell/ChatsSidebar';
import ServerRail from '@/components/live/shell/ServerRail';
import DMConversation from '@/components/live/dm/DMConversation';
import CreateChannelModal from '@/components/live/CreateChannelModal';
import CommandPalette, {
  PaletteIcons,
  usePaletteShortcut,
  type PaletteAction,
} from '@/components/live/shell/CommandPalette';
import ShortcutsModal, { useShortcutsHotkey } from '@/components/live/shell/ShortcutsModal';
import { useLiveStream } from '@/lib/live/useLiveStream';
import TypingIndicator from '@/components/live/channel/TypingIndicator';
import PinnedPanel from '@/components/live/channel/PinnedPanel';
import SearchModal from '@/components/live/channel/SearchModal';
import ThreadPanel from '@/components/live/channel/ThreadPanel';
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

  // Reply context for the channel composer (DM has its own local state).
  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    content: string;
    authorName: string;
    authorImage?: string | null;
  } | null>(null);

  // Clear reply context when switching channels so you don't reply into a different room.
  useEffect(() => {
    setReplyToMessage(null);
    setShowPins(false);
    setShowSearch(false);
    setThreadRootId(null);
  }, [active?.id]);

  const [showPins, setShowPins] = useState(false);
  const [pinsRefreshKey, setPinsRefreshKey] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [threadRootId, setThreadRootId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Channel history pagination — each channel tracks its own cursor so
  // flipping between rooms doesn't lose scroll position.
  const [nextCursorByChannel, setNextCursorByChannel] = useState<Record<string, string | null>>({});
  const [loadingOlderByChannel, setLoadingOlderByChannel] = useState<Record<string, boolean>>({});
  const [loadedChannels, setLoadedChannels] = useState<Set<string>>(new Set());

  // Account suspension state — populated when an API call rejects a send
  // with { banned: true }. Disables composers and surfaces a banner.
  const [banInfo, setBanInfo] = useState<{ reason: string; expiresAt: string } | null>(null);

  // Who's typing in which channel — expiresAt is a monotonic timeout we clear
  // either on typing:stop or after 5s of silence as a safety net.
  const [typingByChannel, setTypingByChannel] = useState<
    Record<string, Record<string, { name: string; expiresAt: number }>>
  >({});

  // Presence heartbeat — mark user online while the chat is mounted, away when
  // the tab is hidden, offline when they navigate away.
  useEffect(() => {
    if (status !== 'authenticated') return;
    const ping = (s: 'online' | 'away' | 'offline') =>
      fetch('/api/live/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: s }),
        keepalive: s === 'offline',
      }).catch(() => {});

    ping('online');
    const onVisibility = () => ping(document.visibilityState === 'visible' ? 'online' : 'away');
    const onUnload = () => ping('offline');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onUnload);
    const heartbeat = setInterval(() => ping('online'), 60_000);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [status]);

  // Tick every second to evict expired typers without keeping a listener alive
  // per entry.
  useEffect(() => {
    const t = setInterval(() => {
      setTypingByChannel((prev) => {
        let changed = false;
        const next: typeof prev = {};
        const now = Date.now();
        for (const [ch, users] of Object.entries(prev)) {
          const kept: typeof users = {};
          for (const [uid, info] of Object.entries(users)) {
            if (info.expiresAt > now) kept[uid] = info;
            else changed = true;
          }
          if (Object.keys(kept).length > 0) next[ch] = kept;
          else if (Object.keys(users).length > 0) changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

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

    // Periodic refresh so sidebar activity dots stay honest for rooms the user
    // isn't currently subscribed to via SSE. Only fires while the tab is
    // visible — no wasted work while the user is elsewhere.
    const refreshChannels = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetch('/api/live/channels')
        .then((r) => r.json())
        .then((data) => {
          const pub = (data.public as Channel[]) || [];
          const privateOwned = (data.privateOwned as Channel[]) || [];
          setChannels([...pub, ...privateOwned]);
        })
        .catch(() => {});
    };
    const interval = setInterval(refreshChannels, 45_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshChannels();
    };
    document.addEventListener('visibilitychange', onVisible);

    // Fetch DM conversations
    fetch('/api/live/dms').then(r => r.json()).then((data) => {

      setDMConversations(data.conversations || []);
    }).catch((error) => {
      console.error('Error loading DM conversations:', error);
      // For development/testing, you can uncomment the line below to add mock data
      // setDMConversations([]);
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const channelId = active.id;
    // If we've never loaded this channel, clear the pane while fetching so the
    // skeleton shows instead of a flash of the previous channel's history.
    if (!loadedChannels.has(channelId)) {
      setMessages([]);
    }
    fetch(`/api/live/messages?channel=${encodeURIComponent(channelId)}&limit=50`)
      .then(r => r.json())
      .then((data) => {
        setMessages((data.messages || []) as LiveMessage[]);
        setNextCursorByChannel((prev) => ({ ...prev, [channelId]: data.nextCursor ?? null }));
        setLoadedChannels((prev) => {
          if (prev.has(channelId)) return prev;
          const next = new Set(prev);
          next.add(channelId);
          return next;
        });
      })
      .catch(() => {
        setMessages([]);
        setNextCursorByChannel((prev) => ({ ...prev, [channelId]: null }));
        setLoadedChannels((prev) => {
          if (prev.has(channelId)) return prev;
          const next = new Set(prev);
          next.add(channelId);
          return next;
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // Prepend an older page of messages and roll the cursor forward.
  const activeRef = useRef<string | null>(null);
  useEffect(() => { activeRef.current = active?.id ?? null; }, [active?.id]);

  const handleLoadOlder = useCallback(async () => {
    const channelId = activeRef.current;
    if (!channelId) return;
    const cursor = nextCursorByChannel[channelId];
    if (!cursor) return;
    if (loadingOlderByChannel[channelId]) return;
    setLoadingOlderByChannel((prev) => ({ ...prev, [channelId]: true }));
    try {
      const res = await fetch(
        `/api/live/messages?channel=${encodeURIComponent(channelId)}&cursor=${encodeURIComponent(cursor)}&limit=50`
      );
      if (!res.ok) return;
      const data = await res.json();
      // Bail if the user switched channels while we were loading.
      if (activeRef.current !== channelId) return;
      const older = (data.messages || []) as LiveMessage[];
      if (older.length > 0) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...older.filter((m) => !seen.has(m.id)), ...prev];
          return merged;
        });
      }
      setNextCursorByChannel((prev) => ({ ...prev, [channelId]: data.nextCursor ?? null }));
    } finally {
      setLoadingOlderByChannel((prev) => ({ ...prev, [channelId]: false }));
    }
  }, [nextCursorByChannel, loadingOlderByChannel]);

  useEffect(() => {
    if (!activeDM) return;
    fetch(`/api/live/dms/${activeDM.id}`)
      .then(r => r.json())
      .then((data) => setDMMessages(data.messages || []))
      .catch(() => setDMMessages([]));
  }, [activeDM?.id]);

  // Subscribe to the SSE live bus: channel room for the active channel, plus
  // a user-scoped room so DMs reach us regardless of which channel is open.
  // Replaces the former 2s polling.
  const liveRooms = useMemo(() => {
    const rooms: string[] = [];
    if (session?.user?.id) rooms.push(`user:${session.user.id}`);
    if (active?.id) rooms.push(`channel:${active.id}`);
    return rooms;
  }, [active?.id, session?.user?.id]);

  useLiveStream({
    rooms: liveRooms,
    enabled: status === 'authenticated',
    onEvent: (event, payload) => {
      if (event === 'message:new') {
        const m = payload as LiveMessage;
        if (!active?.id || m.channelId !== active.id) return;
        setMessages((prev) => {
          // Reconcile: if we have an optimistic copy (`tmp-*`) for this send,
          // replace it; otherwise append — unless already present.
          let next = prev;
          if (!next.some((x) => x.id === m.id)) {
            const ownerIdx =
              m.authorId === session?.user?.id
                ? next.findIndex(
                    (x) =>
                      (x.id.startsWith('tmp-') || x.id.startsWith('tmp-thr-')) &&
                      x.authorId === m.authorId &&
                      x.content === m.content
                  )
                : -1;
            if (ownerIdx >= 0) {
              const copy = next.slice();
              copy[ownerIdx] = m;
              next = copy;
            } else {
              next = [...next, m];
            }
          }
          // If this is a threaded reply, increment the parent's replyCount locally.
          if (m.replyToId) {
            next = next.map((x) =>
              x.id === m.replyToId ? { ...x, replyCount: (x.replyCount ?? 0) + 1 } : x
            );
          }
          return next;
        });
      } else if (event === 'message:deleted') {
        const { messageId } = payload as { messageId: string };
        setMessages((prev) => prev.filter((x) => x.id !== messageId));
      } else if (event === 'message:updated') {
        const { messageId, content, editedAt } = payload as {
          messageId: string;
          content: string;
          editedAt: string | null;
        };
        setMessages((prev) =>
          prev.map((x) => (x.id === messageId ? { ...x, content, editedAt } : x))
        );
      } else if (event === 'message:pinned') {
        const { messageId, pinnedAt, pinnedBy } = payload as {
          messageId: string;
          pinnedAt: string | null;
          pinnedBy: string | null;
        };
        setMessages((prev) =>
          prev.map((x) => (x.id === messageId ? { ...x, pinnedAt, pinnedBy } : x))
        );
        setPinsRefreshKey((k) => k + 1);
      } else if (event === 'message:unpinned') {
        const { messageId } = payload as { messageId: string };
        setMessages((prev) =>
          prev.map((x) => (x.id === messageId ? { ...x, pinnedAt: null, pinnedBy: null } : x))
        );
        setPinsRefreshKey((k) => k + 1);
      } else if (event === 'dm:updated') {
        const { messageId, content, editedAt } = payload as {
          messageId: string;
          content: string;
          editedAt: string | null;
        };
        setDMMessages((prev) =>
          prev.map((x: any) => (x.id === messageId ? { ...x, content, editedAt } : x))
        );
      } else if (event === 'reaction:updated') {
        const { messageId, messageType, reactions } = payload as {
          messageId: string;
          messageType: 'channel' | 'dm';
          reactions: LiveMessage['reactions'];
        };
        if (messageType === 'channel') {
          setMessages((prev) =>
            prev.map((x) => (x.id === messageId ? { ...x, reactions } : x))
          );
        } else {
          setDMMessages((prev) =>
            prev.map((x: any) => (x.id === messageId ? { ...x, reactions } : x))
          );
        }
      } else if (event === 'dm:new') {
        const dm = payload as any;
        // Only apply if the event targets the currently open conversation.
        if (activeDM?.id && dm.conversationId === activeDM.id) {
          setDMMessages((prev) => {
            if (prev.some((x) => x.id === dm.id)) return prev;
            const ownerIdx =
              dm.senderId === session?.user?.id
                ? prev.findIndex(
                    (x) => x.id.startsWith('tmp-dm-') && x.senderId === dm.senderId && x.content === dm.content
                  )
                : -1;
            if (ownerIdx >= 0) {
              const copy = prev.slice();
              copy[ownerIdx] = dm;
              return copy;
            }
            return [...prev, dm];
          });
        }
        // Refresh conversation list so sidebar counters & last-message update.
        fetch('/api/live/dms')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => data && setDMConversations(data.conversations || []))
          .catch(() => {});
      } else if (event === 'dm:deleted') {
        const { messageId } = payload as { messageId: string };
        setDMMessages((prev) => prev.filter((x: any) => x.id !== messageId));
      } else if (event === 'typing:start' || event === 'typing:stop') {
        const { userId, userName, channelId: typingChannelId } = payload as {
          userId: string;
          userName: string;
          channelId: string;
        };
        // Ignore our own typing echo.
        if (userId === session?.user?.id) return;
        setTypingByChannel((prev) => {
          const forChannel = { ...(prev[typingChannelId] || {}) };
          if (event === 'typing:start') {
            forChannel[userId] = { name: userName || 'Someone', expiresAt: Date.now() + 5000 };
          } else {
            delete forChannel[userId];
          }
          return { ...prev, [typingChannelId]: forChannel };
        });
      }
    },
  });

  // Typing users for the currently open channel, shaped for the indicator.
  const activeTypers = useMemo(() => {
    if (!active?.id) return [];
    const map = typingByChannel[active.id] || {};
    return Object.entries(map).map(([id, info]) => ({ id, name: info.name }));
  }, [typingByChannel, active?.id]);

  const handleEditMessage = async (
    messageId: string,
    newContent: string,
    messageType: 'channel' | 'dm'
  ) => {
    const endpoint =
      messageType === 'channel'
        ? `/api/live/messages/${messageId}`
        : `/api/live/dms/message/${messageId}`;
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to edit' }));
        alert(err.error || 'Failed to edit message');
        return;
      }
      const updated = await res.json();
      if (messageType === 'channel') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: updated.content, editedAt: updated.editedAt } : m
          )
        );
      } else {
        setDMMessages((prev) =>
          prev.map((m: any) =>
            m.id === messageId ? { ...m, content: updated.content, editedAt: updated.editedAt } : m
          )
        );
      }
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Network error while editing message');
    }
  };

  const handleTogglePin = async (messageId: string, currentlyPinned: boolean) => {
    try {
      const res = await fetch(`/api/live/messages/${messageId}/pin`, {
        method: currentlyPinned ? 'DELETE' : 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        alert(err.error || 'Failed to update pin');
        return;
      }
      // SSE will update state; nothing else required here.
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const isChannelOwner = active?.ownerId === session?.user?.id;
  const pinnedCount = useMemo(
    () => messages.filter((m) => !!m.pinnedAt).length,
    [messages]
  );

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

  const handleSendMessage = async (text: string, replyToId?: string, files?: Array<{id: string, name: string, type: string, url: string}>) => {
    console.log('🔍 handleSendMessage called with:', { text, replyToId, files });
    
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

      // If files are attached, append file information to content
      let messageContent = text;
      if (files && files.length > 0) {
        console.log('🔍 Files detected, creating message content with files:', files);
        const fileList = files.map(file => `📎 ${file.name}`).join('\n');
        messageContent = text ? `${text}\n\n${fileList}` : fileList;
      }

      const optimistic: LiveMessage = {
        id: `tmp-${Math.random().toString(36).slice(2)}`,
        channelId: active.id,
        authorId: session?.user?.id || 'unknown',
        authorName: session?.user?.name || 'You',
        authorImage: session?.user?.image || null,
        content: messageContent,
        type: 'text',
        createdAt: new Date().toISOString(),
        replyToId: replyToId,
        replyTo: replyToData,
        files: files ? files.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          url: file.url,
          size: 0, // We don't have size in the optimistic update
          uploader: {
            id: session?.user?.id || 'unknown',
            name: session?.user?.name || 'You',
            image: session?.user?.image || null,
          }
        })) : undefined,
      };
      
      console.log('🔍 Created optimistic message:', optimistic);
      console.log('🔍 Optimistic message files:', optimistic.files);
      
      setMessages(prev => {
        const newMessages = [...prev, optimistic];
        console.log('🔍 Updated messages array, total messages:', newMessages.length);
        return newMessages;
      });
      try {

        const res = await fetch('/api/live/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': document.cookie // Ensure cookies are sent
          },
          credentials: 'include', // Include credentials
          body: JSON.stringify({ channelId: active.id, content: text, replyToId, files })
        });

        if (res.ok) {
          const created = await res.json();

          // Preserve reply context and optimistic files if API response lacks them
          const createdWithReply = {
            ...created,
            replyToId: created.replyToId ?? optimistic.replyToId,
            replyTo: created.replyTo ?? optimistic.replyTo,
            files: (created.files && created.files.length > 0)
              ? created.files
              : (optimistic.files || undefined),
          } as LiveMessage;
          setMessages(prev => prev.map(m => m.id === optimistic.id ? createdWithReply : m));
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Failed to send message' }));
          if (res.status === 403 && errorData.banned) {
            setBanInfo({
              reason: errorData.reason || 'Violation of community guidelines',
              expiresAt: errorData.expiresAt,
            });
            // Remove the optimistic message — the banner will explain why.
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
          } else {
            console.error('Failed to send message:', errorData);
            // Keep the message but mark it as failed
            setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, content: `${m.content} (Failed to send)` } : m));
          }
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
          if (res.status === 403 && errorData.banned) {
            setBanInfo({
              reason: errorData.reason || 'Violation of community guidelines',
              expiresAt: errorData.expiresAt,
            });
            setDMMessages(prev => prev.filter(m => m.id !== optimisticDM.id));
          } else {
            console.error('Failed to send DM:', errorData);
            // Keep the message but mark it as failed
            setDMMessages(prev => prev.map(m => m.id === optimisticDM.id ? { ...m, content: `${m.content} (Failed to send)` } : m));
          }
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

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      {
        id: 'create-channel',
        label: 'Create a new channel',
        hint: 'opens dialog',
        icon: PaletteIcons.Plus,
        run: () => setShowCreateModal(true),
      },
      {
        id: 'friends',
        label: 'Open Friends panel',
        hint: 'switch to DMs',
        icon: PaletteIcons.Users,
        run: () => handleShowFriends(),
      },
      {
        id: 'toggle-details',
        label: showDetails ? 'Hide details panel' : 'Show details panel',
        icon: PaletteIcons.MessageSquare,
        run: () => setShowDetails((v) => !v),
      },
      {
        id: 'open-search',
        label: 'Search messages in current channel',
        hint: active ? `#${active.name}` : 'select a channel first',
        icon: PaletteIcons.Hash,
        run: () => {
          if (active) setShowSearch(true);
        },
      },
      {
        id: 'open-shortcuts',
        label: 'Show keyboard shortcuts',
        hint: 'press ? anywhere',
        icon: PaletteIcons.MessageSquare,
        run: () => setShowShortcuts(true),
      },
    ],
    [active, showDetails],
  );

  const togglePalette = useCallback(() => setShowPalette((s) => !s), []);
  usePaletteShortcut(togglePalette);

  const openShortcuts = useCallback(() => setShowShortcuts(true), []);
  useShortcutsHotkey(openShortcuts);

  useEffect(() => {
    const handler = () => setShowPalette(true);
    window.addEventListener('chat:open-palette', handler);
    return () => window.removeEventListener('chat:open-palette', handler);
  }, []);

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
    <div className="h-[calc(100vh-var(--header-h)-8px)] min-h-0">
      <div className="grid h-full grid-cols-[72px_var(--sidebar,320px)_minmax(0,1fr)_auto] transition-[grid-template-columns] duration-300">
        {/* Left: Server Rail */}
        <div className="overflow-hidden hidden lg:block">
          <ServerRail
            activeView={sidebarView}
            onViewChange={handleSidebarViewChange}
            onOpenSearch={() => setShowPalette(true)}
            onOpenShortcuts={() => setShowShortcuts(true)}
            user={{
              name: session?.user?.name ?? undefined,
              image: session?.user?.image ?? undefined,
              status: 'online',
            }}
          />
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
        <div className="min-w-0 min-h-0 flex flex-col p-2">
          {viewMode === 'channel' ? (
            <>
              <div className="flex flex-col flex-1 min-h-0">
                <Conversation
                  channel={active}
                  messages={messages}
                  onToggleDetails={() => setShowDetails((v) => !v)}
                  detailsOpen={showDetails}
                  onUnsendMessage={(messageId) => handleUnsendMessage(messageId, 'channel')}
                  onReplyMessage={setReplyToMessage}
                  onEditMessage={(id, text) => handleEditMessage(id, text, 'channel')}
                  onTogglePin={handleTogglePin}
                  onOpenThread={(id) => setThreadRootId(id)}
                  onOpenPins={() => setShowPins(true)}
                  onOpenSearch={() => setShowSearch(true)}
                  canPin={isChannelOwner}
                  pinnedCount={pinnedCount}
                  onLoadOlder={handleLoadOlder}
                  hasMoreBefore={active ? !!nextCursorByChannel[active.id] : false}
                  loadingOlder={active ? !!loadingOlderByChannel[active.id] : false}
                  currentUserId={session?.user?.id ?? null}
                  initialLoading={active ? !loadedChannels.has(active.id) : false}
                  onOpenCreateChannel={() => setShowCreateModal(true)}
                />
              </div>
              {active && (
                <>
                  <TypingIndicator users={activeTypers} />
                  {banInfo && <SuspensionBanner banInfo={banInfo} />}
                  <MessageInput
                    onSendMessage={handleSendMessage}
                    channelId={active.id}
                    disabled={!!banInfo}
                    replyContext={
                      replyToMessage
                        ? { message: replyToMessage, onCancel: () => setReplyToMessage(null) }
                        : undefined
                    }
                  />
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col flex-1 min-h-0">
                <DMConversation
                  conversation={activeDM}
                  messages={dmMessages}
                  onToggleDetails={() => setShowDetails((v) => !v)}
                  detailsOpen={showDetails}
                  onSendMessage={handleSendMessage}
                  onUnsendMessage={(messageId) => handleUnsendMessage(messageId, 'dm')}
                  composerDisabled={!!banInfo}
                  composerBanner={banInfo ? <SuspensionBanner banInfo={banInfo} /> : undefined}
                />
              </div>
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

      {/* Jump helper — find the message element in the DOM and scroll it into view. */}
      {/* Pinned panel */}
      {showPins && active && (
        <PinnedPanel
          channelId={active.id}
          refreshKey={pinsRefreshKey}
          onClose={() => setShowPins(false)}
          onJumpTo={(id) => {
            const el = document.querySelector(`[data-message-id="${id}"]`) as HTMLElement | null;
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          canUnpin={isChannelOwner}
          onUnpin={(id) => handleTogglePin(id, true)}
        />
      )}

      {/* Search modal */}
      {showSearch && active && (
        <SearchModal
          channelId={active.id}
          channelName={active.name}
          onClose={() => setShowSearch(false)}
          onJumpTo={(id) => {
            const el = document.querySelector(`[data-message-id="${id}"]`) as HTMLElement | null;
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      {/* Thread panel */}
      {threadRootId && active && (
        <ThreadPanel
          rootMessageId={threadRootId}
          channelId={active.id}
          onClose={() => setThreadRootId(null)}
          onJumpToRoot={(id) => {
            const el = document.querySelector(`[data-message-id="${id}"]`) as HTMLElement | null;
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          onMessageSent={(msg) => {
            // The new reply will also arrive via SSE; just bump reply count immediately
            // for the root message if it's in the main list.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === threadRootId ? { ...m, replyCount: (m.replyCount ?? 0) + 1 } : m
              )
            );
          }}
        />
      )}

      {/* Command Palette — Cmd/Ctrl+K or "/" when nothing is focused */}
      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        channels={channels}
        dmConversations={dmConversations}
        onSelectChannel={handleSelectChannel}
        onSelectDM={handleSelectDM}
        actions={paletteActions}
      />

      {/* Shortcuts modal — `?` key or /help */}
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Create Channel Modal */}
      <CreateChannelModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={async (settings) => {
          const res = await fetch('/api/live/channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: settings.name,
              description: settings.description,
              category: settings.category,
              password: settings.passwordEnabled ? settings.password : undefined,
              inviteOnly: settings.inviteOnly,
              allowMemberInvites: settings.allowMemberInvites,
              slowModeSeconds: settings.slowModeSeconds,
              maxMembers: settings.maxMembers,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error || 'Could not create the channel. Please try again.');
          }
          const newChannel = await res.json();
          const channelsRes = await fetch('/api/live/channels');
          if (channelsRes.ok) {
            const channelsData = await channelsRes.json();
            const pub = channelsData.public as Channel[];
            const privateOwned = channelsData.privateOwned as Channel[];
            const allChannels = [...pub, ...privateOwned];
            setChannels(allChannels);
            const createdChannel = allChannels.find((c) => c.id === newChannel.id);
            if (createdChannel) {
              setActive(createdChannel);
              setViewMode('channel');
              setSidebarView('channels');
            }
          }
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}

// Note: Slide-over removed for ChatDashboard (details lives in grid right pane)

function SuspensionBanner({ banInfo }: { banInfo: { reason: string; expiresAt: string } }) {
  const expiresDate = banInfo.expiresAt ? new Date(banInfo.expiresAt) : null;
  const expiresLabel =
    expiresDate && !Number.isNaN(expiresDate.getTime())
      ? expiresDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mx-1 mb-2 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
    >
      <svg
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div className="flex-1 space-y-1">
        <p className="font-medium text-red-200">Your account is suspended</p>
        <p className="text-red-100/80">
          Reason: {banInfo.reason || 'Violation of community guidelines'}
        </p>
        {expiresLabel && (
          <p className="text-red-100/70">Suspension ends: {expiresLabel}</p>
        )}
        <p className="text-red-100/60 text-xs">
          You cannot send messages while suspended. Contact support if you believe this is a mistake.
        </p>
      </div>
    </div>
  );
}
