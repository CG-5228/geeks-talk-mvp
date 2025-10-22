"use client";
import { MessageSquare } from 'lucide-react';

interface ReplyIndicatorProps {
  replyTo: {
    id: string;
    content: string;
    authorName: string;
    authorImage?: string | null;
  };
  isOwnMessage?: boolean;
}

export default function ReplyIndicator({ replyTo, isOwnMessage = false }: ReplyIndicatorProps) {
  return (
    <div className={`mb-2 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
      <div className={`inline-flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border-l-4 border-blue-500 max-w-xs ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
        <MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-blue-400 font-medium truncate">
            Replying to {replyTo.authorName}
          </div>
          <div className="text-xs text-[rgba(220,235,255,0.7)] truncate">
            {replyTo.content}
          </div>
        </div>
      </div>
    </div>
  );
}
