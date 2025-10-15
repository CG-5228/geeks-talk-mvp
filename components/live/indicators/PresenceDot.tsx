"use client";

interface PresenceDotProps {
  status: 'online' | 'offline' | 'away';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PresenceDot({ status, size = 'md', className = '' }: PresenceDotProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500'
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`${sizeClasses[size]} rounded-full ${statusColors[status]} border-2 border-[color:var(--nav-bg)]`}
        title={`${status.charAt(0).toUpperCase() + status.slice(1)}`}
      />
    </div>
  );
}
