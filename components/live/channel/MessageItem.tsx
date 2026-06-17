"use client";
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { forwardRef, useState, useRef, useEffect } from 'react';
import { Pin, MessagesSquare } from 'lucide-react';
import type { LiveMessage } from '@/types/live';
import UserAvatarMenu from '@/components/live/user/UserAvatarMenu';
import ReactionDisplay from '@/components/live/reactions/ReactionDisplay';
import MessageActionMenu from '@/components/live/message/MessageActionMenu';
import ReplyIndicator from '@/components/live/message/ReplyIndicator';
import ForwardIndicator from '@/components/live/message/ForwardIndicator';
import FilePreview from '@/components/live/message/FilePreview';
import MessageContent from '@/components/live/message/MessageContent';
import LinkPreviewCard from '@/components/live/message/LinkPreviewCard';
import { extractFirstUrl } from '@/lib/live/useLinkPreview';

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

interface MessageItemProps {
  msg: LiveMessage;
  onUnsendMessage?: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onReplyMessage?: (message: { id: string; content: string; authorName: string; authorImage?: string | null }) => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void> | void;
  onTogglePin?: (messageId: string, currentlyPinned: boolean) => void;
  onOpenThread?: (messageId: string) => void;
  canPin?: boolean;
  flashed?: boolean;
  groupStart?: boolean;
}

const MessageItem = forwardRef<HTMLDivElement, MessageItemProps>(
  (
    {
      msg,
      onUnsendMessage,
      onJumpToMessage,
      onReplyMessage,
      onEditMessage,
      onTogglePin,
      onOpenThread,
      canPin = false,
      flashed,
      groupStart = true,
    },
    ref
  ) => {
    const { data: session } = useSession();
    const isOwnMessage = session?.user?.id === msg.authorId;
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const avatarRef = useRef<HTMLDivElement>(null);
    const messageRef = useRef<HTMLDivElement>(null);
    const editRef = useRef<HTMLTextAreaElement>(null);

    const handleUnsend = async () => {
      if (onUnsendMessage) onUnsendMessage(msg.id);
    };

    useEffect(() => {
      if (editing && editRef.current) {
        editRef.current.focus();
        const len = editRef.current.value.length;
        editRef.current.setSelectionRange(len, len);
      }
    }, [editing]);

    const fileAttachments = msg.files || [];
    const isForwarded = msg.content.startsWith('Forwarded from ');
    const isPinned = !!msg.pinnedAt;
    const wasEdited = !!msg.editedAt;
    const replyCount = msg.replyCount ?? 0;

    const beginEdit = () => {
      const plain = (isForwarded
        ? msg.content.split('\n').slice(1).join('\n')
        : msg.content
      ).replace(/📎\s+.+/g, '').trim();
      setEditValue(plain);
      setEditing(true);
    };

    const saveEdit = async () => {
      const trimmed = editValue.trim();
      if (!trimmed || savingEdit || !onEditMessage) {
        setEditing(false);
        return;
      }
      setSavingEdit(true);
      try {
        await onEditMessage(msg.id, trimmed);
        setEditing(false);
      } finally {
        setSavingEdit(false);
      }
    };
    // Strip file-attachment pseudo-content lines and forwarded header before rendering markdown.
    const textContent = (isForwarded
      ? msg.content.split('\n').slice(1).join('\n')
      : msg.content
    )
      .replace(/📎\s+.+/g, '')
      .trim();

    return (
      <div
        ref={ref}
        data-message-id={msg.id}
        className={`relative group flex items-start gap-3 transition-colors rounded-lg -mx-2 px-2 ${
          isOwnMessage ? 'flex-row-reverse' : ''
        } ${flashed ? 'bg-[color:hsl(var(--primary)/0.12)]' : ''}`}
      >
        {groupStart ? (
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
        ) : (
          <div
            ref={avatarRef}
            className="w-8 h-8 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          >
            <span className="text-[10px] text-[rgba(220,235,255,0.55)] font-mono">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        <div className={`min-w-0 ${isOwnMessage ? 'flex-1 text-right' : 'max-w-fit'}`}>
          {groupStart && (
            <div className={`flex items-center gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
              <span className="font-semibold text-[rgba(236,245,255,0.95)]">{msg.authorName}</span>
              <span className="text-xs text-[rgba(220,235,255,0.7)]">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isPinned && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[color:hsl(var(--primary))]"
                  aria-label="Pinned message"
                >
                  <Pin className="w-3 h-3" />
                  Pinned
                </span>
              )}
            </div>
          )}

          {msg.replyTo && (
            <div
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (msg.replyTo && onJumpToMessage) onJumpToMessage(msg.replyTo.id);
              }}
              role="button"
              aria-label={`Jump to message from ${msg.replyTo.authorName}`}
            >
              <ReplyIndicator replyTo={msg.replyTo} isOwnMessage={isOwnMessage} />
            </div>
          )}

          {isForwarded && (
            <ForwardIndicator
              meta={{
                authorName: msg.content.split('Forwarded from ')[1]?.split(' • ')[0] || 'User',
                location: msg.content.split(' • ')[1]?.trim() || '',
                time: msg.content.split(' • ')[2]?.split('\n')[0] || '',
                preview: msg.content.split('\n').slice(1).join('\n'),
              }}
              isOwnMessage={isOwnMessage}
            />
          )}

          <div className={`flex flex-col gap-1 ${isOwnMessage ? 'items-end' : ''}`}>
            <div
              ref={messageRef}
              className={`relative transition-all duration-200 max-w-fit ${
                isPinned ? 'ring-1 ring-[color:hsl(var(--primary)/0.4)]' : ''
              } ${
                isForwarded
                  ? isOwnMessage
                    ? 'bg-gradient-to-br from-blue-500/25 to-blue-600/15 rounded-2xl px-4 py-3 inline-block hover:from-blue-500/30 hover:to-blue-600/20 shadow-lg border border-blue-400/20'
                    : 'bg-gradient-to-br from-gray-500/25 to-gray-600/15 rounded-2xl px-4 py-3 inline-block hover:from-gray-500/30 hover:to-gray-600/20 shadow-lg border border-gray-400/20'
                  : isOwnMessage
                    ? 'bg-blue-500/20 rounded-2xl px-3 py-2 inline-block hover:bg-blue-500/30'
                    : 'bg-gray-600/20 rounded-2xl px-3 py-2 inline-block hover:bg-gray-600/30'
              }`}
              onClick={(e) => {
                if (editing) return;
                e.preventDefault();
                e.stopPropagation();
                setShowActionMenu(true);
              }}
            >
              {editing ? (
                <div className="flex flex-col gap-2 min-w-[240px]">
                  <textarea
                    ref={editRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveEdit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditing(false);
                      }
                    }}
                    rows={Math.min(6, Math.max(2, editValue.split('\n').length))}
                    className="w-full resize-y rounded-lg bg-black/30 border border-white/15 px-3 py-2 text-sm text-[rgba(236,245,255,0.95)] outline-none focus:border-[color:hsl(var(--primary))]"
                    aria-label="Edit message"
                  />
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-2.5 py-1 rounded-md hover:bg-white/10 text-[rgba(220,235,255,0.75)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingEdit || !editValue.trim()}
                      onClick={saveEdit}
                      className="px-2.5 py-1 rounded-md bg-[color:hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium disabled:opacity-50"
                    >
                      {savingEdit ? 'Saving…' : 'Save'}
                    </button>
                    <span className="text-[10px] text-[rgba(220,235,255,0.55)]">Enter to save • Esc to cancel</span>
                  </div>
                </div>
              ) : (
                <>
                  {textContent && (
                    <div className="cursor-pointer">
                      <MessageContent content={textContent} isOwnMessage={isOwnMessage} />
                      {wasEdited && (
                        <span className="ml-1 text-[10px] text-[rgba(220,235,255,0.55)] italic" aria-label="Edited">
                          (edited)
                        </span>
                      )}
                    </div>
                  )}

                  {fileAttachments.length > 0 && (
                    <div className={textContent ? 'mt-2' : ''}>
                      <FilePreview files={fileAttachments} isOwnMessage={isOwnMessage} />
                    </div>
                  )}

                  {(() => {
                    const url = extractFirstUrl(textContent);
                    return url ? <LinkPreviewCard url={url} isOwnMessage={isOwnMessage} /> : null;
                  })()}
                </>
              )}
            </div>

            <ReactionDisplay
              messageId={msg.id}
              messageType="channel"
              isOwnMessage={isOwnMessage}
              reactions={msg.reactions}
            />

            {replyCount > 0 && onOpenThread && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenThread(msg.id);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-[color:hsl(var(--primary))] hover:underline"
                aria-label={`Open thread with ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}`}
              >
                <MessagesSquare className="w-3 h-3" />
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>

        <UserAvatarMenu
          user={{
            id: msg.authorId,
            name: msg.authorName,
            image: msg.authorImage,
            onlineStatus: 'offline',
          }}
          isOpen={showAvatarMenu}
          onClose={() => setShowAvatarMenu(false)}
          anchorRef={avatarRef}
        />

        <MessageActionMenu
          messageId={msg.id}
          messageType="channel"
          isOpen={showActionMenu}
          onClose={() => setShowActionMenu(false)}
          onReply={onReplyMessage}
          onForward={() => {}}
          onUnsend={isOwnMessage ? handleUnsend : undefined}
          onEdit={isOwnMessage && onEditMessage ? beginEdit : undefined}
          onOpenThread={onOpenThread ? () => onOpenThread(msg.id) : undefined}
          onTogglePin={onTogglePin ? () => onTogglePin(msg.id, isPinned) : undefined}
          canPin={canPin}
          isPinned={isPinned}
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
  }
);

MessageItem.displayName = 'MessageItem';

export default MessageItem;
