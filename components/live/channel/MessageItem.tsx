"use client";
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { forwardRef, useState, useRef } from 'react';
import type { LiveMessage } from '@/types/live';
import UserAvatarMenu from '@/components/live/user/UserAvatarMenu';
import ReactionDisplay from '@/components/live/reactions/ReactionDisplay';
import MessageActionMenu from '@/components/live/message/MessageActionMenu';
import ReplyIndicator from '@/components/live/message/ReplyIndicator';
import ForwardIndicator from '@/components/live/message/ForwardIndicator';
import FilePreview from '@/components/live/message/FilePreview';
import { parseFileAttachments } from '@/lib/fileUtils';

// Default avatar as data URL to avoid 404s
const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

const MessageItem = forwardRef<HTMLDivElement, { msg: LiveMessage; showDivider?: boolean; onUnsendMessage?: (messageId: string) => void }>(
  ({ msg, showDivider, onUnsendMessage }, ref) => {
    const { data: session } = useSession();
    const isOwnMessage = session?.user?.id === msg.authorId;
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const avatarRef = useRef<HTMLDivElement>(null);
    const messageRef = useRef<HTMLDivElement>(null);

    const handleUnsend = async () => {
      if (onUnsendMessage) {
        onUnsendMessage(msg.id);
      }
    };

    // Get file attachments from message data
    const fileAttachments = msg.files || [];
    const textContent = msg.content.replace(/📎\s+.+/g, '').trim();

    return (
      <div
        ref={ref}
        data-message-id={msg.id}
        className={`relative group flex items-start gap-3 ${showDivider ? 'pt-4' : ''} ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      >
      {showDivider && (
        <div className="absolute -top-2 left-0 right-0 h-px before:content-[''] before:block before:h-px before:bg-[radial-gradient(40%_120%_at_50%_50%,rgba(0,200,255,.35),transparent)] before:opacity-40" />
      )}
      <div
        ref={avatarRef}
        className="relative cursor-pointer hover:opacity-80 transition-opacity"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          setShowAvatarMenu(true);
        }}
      >
        <Image
          src={msg.authorImage || DEFAULT_AVATAR}
          alt={msg.authorName}
          width={32}
          height={32}
          className="rounded-full flex-shrink-0"
          unoptimized={!msg.authorImage}
        />
      </div>
      <div className={`min-w-0 ${isOwnMessage ? 'flex-1 text-right' : 'max-w-fit'}`}>
        <div className={`flex items-center gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
          <span className="font-semibold text-[rgba(236,245,255,0.95)]">{msg.authorName}</span>
          <span className="text-xs text-[rgba(220,235,255,0.7)]">{new Date(msg.createdAt).toLocaleTimeString()}</span>
        </div>

        {/* Reply Indicator */}
        {msg.replyTo && (
          <ReplyIndicator
            replyTo={msg.replyTo}
            isOwnMessage={isOwnMessage}
          />
        )}
        {/* Forward Indicator - detect our forwarded meta by convention */}
        {msg.content.startsWith('Forwarded from ') && (
          <ForwardIndicator
            meta={{
              authorName: msg.content.split('Forwarded from ')[1]?.split(' • ')[0] || 'User',
              location: msg.content.split(' • ')[1]?.trim() || '',
              time: msg.content.split(' • ')[2]?.split('\n')[0] || '',
              preview: msg.content.split('\n').slice(1).join('\n')
            }}
            isOwnMessage={isOwnMessage}
          />
        )}

        <div className={`flex flex-col gap-1 ${isOwnMessage ? 'items-end' : ''}`}>
          <div
            ref={messageRef}
            className={`relative transition-all duration-200 max-w-fit ${
              msg.content.startsWith('Forwarded from ')
                ? isOwnMessage
                  ? 'bg-gradient-to-br from-blue-500/25 to-blue-600/15 rounded-2xl px-4 py-3 inline-block hover:from-blue-500/30 hover:to-blue-600/20 shadow-lg border border-blue-400/20'
                  : 'bg-gradient-to-br from-gray-500/25 to-gray-600/15 rounded-2xl px-4 py-3 inline-block hover:from-gray-500/30 hover:to-gray-600/20 shadow-lg border border-gray-400/20'
                : isOwnMessage
                  ? 'bg-blue-500/20 rounded-2xl px-3 py-2 inline-block hover:bg-blue-500/30'
                  : 'bg-gray-600/20 rounded-2xl px-3 py-2 inline-block hover:bg-gray-600/30'
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              setShowActionMenu(true);
            }}
          >
            {/* Text Content */}
            {textContent && (
              <div className="text-[rgba(220,235,255,0.9)] whitespace-pre-wrap break-words cursor-pointer">
                {msg.content.startsWith('Forwarded from ')
                  ? msg.content.split('\n').slice(1).join('\n')
                  : textContent}
              </div>
            )}
            
            {/* File Attachments */}
            {fileAttachments.length > 0 && (
              <div className="mt-2">
                <FilePreview files={fileAttachments} isOwnMessage={isOwnMessage} />
              </div>
            )}
          </div>

          {/* Reactions */}
          <ReactionDisplay
            messageId={msg.id}
            messageType="channel"
            isOwnMessage={isOwnMessage}
          />
        </div>
      </div>

      {/* Avatar Menu */}
      <UserAvatarMenu
        user={{
          id: msg.authorId,
          name: msg.authorName,
          image: msg.authorImage,
          onlineStatus: 'offline', // We don't have online status in LiveMessage type
        }}
        isOpen={showAvatarMenu}
        onClose={() => setShowAvatarMenu(false)}
        anchorRef={avatarRef}
      />

      {/* Message Action Menu */}
      <MessageActionMenu
        messageId={msg.id}
        messageType="channel"
        isOpen={showActionMenu}
        onClose={() => setShowActionMenu(false)}
        onReply={(message) => {
          // TODO: Implement reply functionality

        }}
        onForward={(message) => {
          // TODO: Implement forward functionality

        }}
        onUnsend={isOwnMessage ? handleUnsend : undefined}
        anchorRef={messageRef}
        isOwnMessage={isOwnMessage}
        message={{
          id: msg.id,
          content: msg.content,
          authorName: msg.authorName,
          authorImage: msg.authorImage,
        }}
      />
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
