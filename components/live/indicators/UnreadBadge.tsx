"use client";

interface UnreadBadgeProps {
  count: number;
  type?: 'channel' | 'dm';
  className?: string;
}

export default function UnreadBadge({ count, type = 'channel', className = '' }: UnreadBadgeProps) {
  if (count === 0) return null;

  const bgColor = type === 'dm' ? 'bg-red-500' : 'bg-primary';
  const textColor = type === 'dm' ? 'text-white' : 'text-primary-foreground';

  return (
    <div 
      className={`${bgColor} ${textColor} text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center ${className}`}
      title={`${count} unread message${count > 1 ? 's' : ''}`}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
}
