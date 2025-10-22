"use client";
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smile, Reply, Share, Trash2 } from 'lucide-react';
import ReactionPicker from '@/components/live/reactions/ReactionPicker';
import ForwardMessageModal from './ForwardMessageModal';
import { useNotifications } from '@/components/ui/NotificationSystem';

interface MessageActionMenuProps {
  messageId: string;
  messageType: 'channel' | 'dm';
  isOpen: boolean;
  onClose: () => void;
  onReply?: (message: { id: string; content: string; authorName: string; authorImage?: string | null }) => void;
  onForward?: (message: { id: string; content: string; authorName: string; authorImage?: string | null }) => void;
  onUnsend?: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  isOwnMessage?: boolean;
  message?: {
    id: string;
    content: string;
    authorName: string;
    authorImage?: string | null;
  };
}

export default function MessageActionMenu({
  messageId,
  messageType,
  isOpen,
  onClose,
  onReply,
  onForward,
  onUnsend,
  anchorRef,
  isOwnMessage = false,
  message
}: MessageActionMenuProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const reactButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const { showNotification } = useNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReact = async (emoji: string) => {
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
        const data = await response.json();

      } else {
        const errorData = await response.json();
        console.error('Failed to manage reaction:', errorData.error);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }

    setShowReactionPicker(false);
    onClose();
  };

  const handleUnsend = () => {
    onUnsend?.();
    onClose();
  };

  const handleForward = async (destinations: string[]) => {
    if (!message) return;

    try {
      const response = await fetch('/api/live/messages/forward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: message.id,
          messageType: messageType,
          destinations,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        const count = data.forwardedCount || 0;
        if (data.errors && data.errors.length > 0) {
          showNotification({
            type: 'warning',
            title: 'Partially forwarded',
            message: `Sent to ${count} destination${count !== 1 ? 's' : ''}. ${data.errors.length} failed.`,
          });
        } else {
          showNotification({
            type: 'success',
            title: 'Message forwarded',
            message: `Sent to ${count} destination${count !== 1 ? 's' : ''}.`,
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to forward message');
      }
    } catch (error) {
      console.error('Error forwarding message:', error);
      showNotification({
        type: 'error',
        title: 'Forward failed',
        message: 'Failed to forward message. Please try again.',
      });
    }
  };

  if (!mounted) return null;

  const menuContent = (
    <>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Menu */}
          <div
            className="fixed z-50 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl w-48"
            style={{
              top: anchorRef.current ? anchorRef.current.getBoundingClientRect().bottom + 8 : '100%',
              left: anchorRef.current ? anchorRef.current.getBoundingClientRect().left : 0,
            }}
          >
            <div className="p-2">
          <button
            ref={reactButtonRef}
            onClick={() => setShowReactionPicker(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-left"
          >
            <Smile className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
            <span className="text-[rgba(220,235,255,0.9)]">React</span>
          </button>

          <button
            onClick={() => {
              if (message) {
                onReply?.(message);
              }
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-left"
          >
            <Reply className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
            <span className="text-[rgba(220,235,255,0.9)]">Reply</span>
          </button>

          <button
            onClick={() => {
              setShowForwardModal(true);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-left"
          >
            <Share className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
            <span className="text-[rgba(220,235,255,0.9)]">Forward</span>
          </button>

          {onUnsend && isOwnMessage && (
            <button
              onClick={handleUnsend}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-left text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              <span>Unsend</span>
            </button>
          )}
            </div>
          </div>
        </>
      )}

      {/* Reaction Picker */}
      {isOpen && (
        <ReactionPicker
          isOpen={showReactionPicker}
          onClose={() => setShowReactionPicker(false)}
          onSelect={handleReact}
          anchorRef={reactButtonRef}
        />
      )}

      {message && showForwardModal && (
        <ForwardMessageModal
          message={message}
          messageType={messageType}
          onClose={() => setShowForwardModal(false)}
          onForward={handleForward}
        />
      )}
    </>
  );

  return createPortal(menuContent, document.body);
}
