'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ThumbsUp } from 'lucide-react';

interface LikeButtonProps {
  userId: string;
  initialLikesCount: number;
  initialIsLiked: boolean;
  className?: string;
}

export default function LikeButton({ 
  userId, 
  initialLikesCount, 
  initialIsLiked, 
  className = '' 
}: LikeButtonProps) {
  const { data: session } = useSession();
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [loading, setLoading] = useState(false);
  
  const handleLike = async () => {
    if (!session?.user || loading) return;
    
    setLoading(true);
    
    try {
      if (isLiked) {
        // Unlike
        const response = await fetch('/api/user/like', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        
        if (response.ok) {
          setIsLiked(false);
          setLikesCount(prev => Math.max(0, prev - 1));
        }
      } else {
        // Like
        const response = await fetch('/api/user/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        
        if (response.ok) {
          setIsLiked(true);
          setLikesCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!session?.user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <ThumbsUp className="h-4 w-4 text-white/30" />
        <span className="text-sm text-white/30">{likesCount}</span>
      </div>
    );
  }
  
  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
        isLiked 
          ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30' 
          : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
      } ${className}`}
    >
      <ThumbsUp className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
      <span className="text-sm font-medium">{likesCount}</span>
    </button>
  );
}
