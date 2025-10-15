"use client";
import { useEffect, useState } from 'react';

interface TypingIndicatorProps {
  users: Array<{
    id: string;
    name: string;
  }>;
  className?: string;
}

export default function TypingIndicator({ users, className = '' }: TypingIndicatorProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (users.length === 0) return null;

  const getDisplayText = () => {
    if (users.length === 1) {
      return `${users[0].name} is typing${dots}`;
    } else if (users.length === 2) {
      return `${users[0].name} and ${users[1].name} are typing${dots}`;
    } else {
      return `${users.length} people are typing${dots}`;
    }
  };

  return (
    <div className={`text-sm text-[rgba(220,235,255,0.7)] italic px-4 py-1 ${className}`}>
      {getDisplayText()}
    </div>
  );
}
