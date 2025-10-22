"use client";
import { ArrowRight, MessageSquare, Clock, Hash } from 'lucide-react';

interface ForwardIndicatorProps {
  meta: {
    authorName: string;
    location: string; // e.g., #channel or Direct Message
    time: string; // formatted time
    preview: string;
  };
  isOwnMessage?: boolean;
}

export default function ForwardIndicator({ meta, isOwnMessage }: ForwardIndicatorProps) {
  return (
    <div
      className={`mb-2 rounded-xl px-4 py-3 shadow-lg border ${
        isOwnMessage
          ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/5 border-blue-400/20'
          : 'bg-gradient-to-r from-gray-500/10 to-gray-600/5 border-gray-400/20'
      }`}
    >
      {/* Header with forward icon and author */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${isOwnMessage ? 'bg-blue-500/20' : 'bg-gray-500/20'}`}>
          <ArrowRight className={`w-3 h-3 ${isOwnMessage ? 'text-blue-300' : 'text-gray-300'}`} />
        </div>
        <span className={`text-sm font-semibold ${isOwnMessage ? 'text-blue-200' : 'text-gray-200'}`}>
          Forwarded from {meta.authorName}
        </span>
      </div>

      {/* Location and time info */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1.5">
          {meta.location.startsWith('#') ? (
            <Hash className="w-3 h-3 text-white/60" />
          ) : (
            <MessageSquare className="w-3 h-3 text-white/60" />
          )}
          <span className="text-xs text-white/70 bg-white/10 px-2 py-1 rounded-md">
            {meta.location}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-white/50" />
          <span className="text-xs text-white/60">{meta.time}</span>
        </div>
      </div>

      {/* Message preview */}
      <div className={`text-sm leading-relaxed ${
        isOwnMessage ? 'text-blue-100' : 'text-gray-100'
      } bg-black/20 rounded-lg px-3 py-2 border-l-2 ${
        isOwnMessage ? 'border-blue-400' : 'border-gray-400'
      }`}>
        {meta.preview}
      </div>
    </div>
  );
}


