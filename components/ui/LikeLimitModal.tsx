'use client';
import { useEffect, useState } from 'react';
import { X, Clock, Heart, AlertCircle } from 'lucide-react';

interface LikeLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxLikes: number;
  remainingTime?: string;
}

export default function LikeLimitModal({ 
  isOpen, 
  onClose, 
  maxLikes, 
  remainingTime = '1 hour' 
}: LikeLimitModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1a1b23] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Like Limit Reached
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Heart className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white/90 text-base leading-relaxed mb-2">
                You've reached the hourly like limit for this user.
              </p>
              <p className="text-white/70 text-sm">
                You can like each user up to <span className="font-semibold text-blue-400">{maxLikes} times per hour</span> to maintain a healthy community environment.
              </p>
            </div>
          </div>

          {/* Time info */}
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white/90 font-medium">Try again in {remainingTime}</p>
                <p className="text-white/60 text-sm">The limit resets every hour</p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 mb-6">
            <h4 className="text-white/90 font-medium mb-2">💡 Tips</h4>
            <ul className="text-white/70 text-sm space-y-1">
              <li>• Like other users to spread the appreciation</li>
              <li>• Quality interactions matter more than quantity</li>
              <li>• The limit helps prevent spam and maintains fairness</li>
            </ul>
          </div>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
