export type Visibility = 'public' | 'private';

export type Channel = {
  id: string;
  name: string;
  slug: string;
  topic?: string | null;
  visibility: Visibility;
  category: string; // General, Computer General, Programming, Cybersecurity, Mathematics, Private
  ownerId?: string | null;
  inviteCode?: string | null;
  createdAt: string;
};

export type LiveCounts = Record<string, number>; // channelId -> online count

export type LiveMessage = {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  content: string;
  type: 'text' | 'emoji' | 'sticker' | 'image';
  createdAt: string;
};

export type FollowStatus = 'pending' | 'mutual' | 'blocked';

export type DMConversation = {
  id: string; // conversationId (sorted userId pair)
  otherUser: {
    id: string;
    name: string;
    username: string;
    image: string | null;
    onlineStatus: 'online' | 'offline' | 'away';
    lastSeen: string | null;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
};

export type UserPresence = {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string | null;
};

export type TypingIndicator = {
  userId: string;
  userName: string;
  channelId: string;
};