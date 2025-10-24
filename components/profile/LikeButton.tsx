'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ThumbsUp } from 'lucide-react';
import LikeLimitModal from '@/components/ui/LikeLimitModal';
import { useLikeLimitModal } from '@/hooks/useLikeLimitModal';

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
  const { modalState, showLikeLimit, hideLikeLimit } = useLikeLimitModal();
  
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
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to unlike user. Please try again.');
        }
      } else {
        // Like
        const response = await fetch('/api/user/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setIsLiked(true);
          setLikesCount(prev => prev + 1);
        } else if (response.status === 429) {
          // Rate limit exceeded - show custom modal
          const maxLikes = parseInt(process.env.NEXT_PUBLIC_MAX_LIKES_PER_USER_PER_HOUR || '4', 10);
          showLikeLimit(maxLikes, '1 hour');
        } else {
          alert(data.error || 'Failed to like user. Please try again.');
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      alert('Failed to like user. Please try again.');
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
    <>
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

      {/* Like Limit Modal */}
      <LikeLimitModal
        isOpen={modalState.isOpen}
        onClose={hideLikeLimit}
        maxLikes={modalState.maxLikes}
        remainingTime={modalState.remainingTime}
      />
    </>
  );
}
