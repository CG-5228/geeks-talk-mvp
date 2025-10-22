"use client";
import { X } from 'lucide-react';

interface MessageReplyContextProps {
  message: {
    id: string;
    content: string;
    authorName: string;
    authorImage?: string | null;
  };
  onCancel: () => void;
}

export default function MessageReplyContext({ message, onCancel }: MessageReplyContextProps) {
  return (
    <div className="bg-gray-700/30 border-l-4 border-blue-500 rounded-lg p-3 mb-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-blue-400 font-medium">Replying to</span>
            <span className="text-xs text-[rgba(220,235,255,0.8)]">{message.authorName}</span>
          </div>
          <p className="text-sm text-[rgba(220,235,255,0.7)] truncate">
            {message.content}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="ml-2 p-1 rounded-md hover:bg-white/5 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
        </button>
      </div>
    </div>
  );
}