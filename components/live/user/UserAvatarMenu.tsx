"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { User, ThumbsUp, Flag } from 'lucide-react';
import UserSummaryCard from './UserSummaryCard';
import ReportUserModal from '@/components/user/ReportUserModal';
import LikeLimitModal from '@/components/ui/LikeLimitModal';
import { useLikeLimitModal } from '@/hooks/useLikeLimitModal';

interface UserAvatarMenuProps {
  user: {
    id: string;
    name: string;
    username?: string;
    image?: string | null;
    onlineStatus: 'online' | 'offline' | 'away';
    likesCount?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

export default function UserAvatarMenu({ user, isOpen, onClose, anchorRef }: UserAvatarMenuProps) {
  const router = useRouter();
  const [showReportModal, setShowReportModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(user.likesCount || 0);
  const [mounted, setMounted] = useState(false);
  const { modalState, showLikeLimit, hideLikeLimit } = useLikeLimitModal();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleViewProfile = () => {
    router.push(`/user/${user.id}`);
    onClose();
  };

  const handleLike = async () => {
    try {
      const response = await fetch('/api/user/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsLiked(data.isLiked);
        setLikesCount(data.likesCount);
      } else if (response.status === 429) {
        // Rate limit exceeded - show custom modal
        const maxLikes = parseInt(process.env.NEXT_PUBLIC_MAX_LIKES_PER_USER_PER_HOUR || '4', 10);
        showLikeLimit(maxLikes, '1 hour');
      } else {
        console.error('Failed to toggle like:', data.error || 'Unknown error');
        alert(data.error || 'Failed to like user. Please try again.');
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      alert('Failed to like user. Please try again.');
    }
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleReportSubmit = async (reportData: { reason: string; category: string; description?: string; attachments?: File[] }) => {
    try {
      // Upload files first if provided
      let uploadedAttachments: any[] = [];
      if (reportData.attachments && reportData.attachments.length > 0) {
        const uploadPromises = reportData.attachments.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch('/api/user/report/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload failed:', uploadResponse.status, errorText);
            let errorMessage = `Failed to upload ${file.name}`;
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorMessage;
            } catch {}
            throw new Error(errorMessage);
          }

          const uploadData = await uploadResponse.json();
          return uploadData;
        });
        uploadedAttachments = await Promise.all(uploadPromises);
      }

      // Build report payload
      const reportBody: any = {
        userId: user.id,
        reason: reportData.reason,
        category: reportData.category,
        description: reportData.description,
      };

      if (uploadedAttachments.length > 0) {
        reportBody.attachments = uploadedAttachments
          .map((result: any) => {
            const file = result?.file || result;
            return {
              fileName: file?.fileName || file?.name,
              fileSize: file?.fileSize ?? file?.size,
              fileType: file?.fileType || file?.type,
              s3Key: file?.s3Key || file?.key,
              s3Url: file?.s3Url || file?.url,
            };
          })
          .filter((att: any) => att && att.s3Url);
      }

      const response = await fetch('/api/user/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportBody),
      });

      if (response.ok) {
        setShowReportModal(false);
        onClose();
      } else {
        const errorText = await response.text();
        console.error('Report submission failed:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to submit report');
        } catch (e) {
          throw new Error(errorText || 'Failed to submit report');
        }
      }
    } catch (error) {
      console.error('Failed to submit report from UserAvatarMenu:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  if (!isOpen || !mounted) return null;

  const menuContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Menu */}
      <div 
        className="fixed z-50 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl w-64"
        style={{
          top: anchorRef.current ? anchorRef.current.getBoundingClientRect().bottom + 8 : '100%',
          left: anchorRef.current ? anchorRef.current.getBoundingClientRect().left : 0,
        }}
      >
        <UserSummaryCard user={{ ...user, likesCount }} />
        
        <div className="p-2">
          <button
            onClick={handleViewProfile}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-left"
          >
            <User className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
            <span className="text-[rgba(220,235,255,0.9)]">View Profile</span>
          </button>
          
          <button
            onClick={handleLike}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-left ${
              isLiked ? 'text-blue-400' : ''
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${isLiked ? 'text-blue-400' : 'text-[rgba(220,235,255,0.7)]'}`} />
            <span className={isLiked ? 'text-blue-400' : 'text-[rgba(220,235,255,0.9)]'}>
              {isLiked ? 'Liked' : 'Like'} ({likesCount})
            </span>
          </button>
          
          <button
            onClick={handleReport}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-left text-red-400 hover:text-red-300"
          >
            <Flag className="w-4 h-4" />
            <span>Report User</span>
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportUserModal
          user={user}
          onSubmit={handleReportSubmit}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Like Limit Modal */}
      <LikeLimitModal
        isOpen={modalState.isOpen}
        onClose={hideLikeLimit}
        maxLikes={modalState.maxLikes}
        remainingTime={modalState.remainingTime}
      />
    </>
  );

  return createPortal(menuContent, document.body);
}
