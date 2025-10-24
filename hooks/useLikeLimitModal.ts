'use client';
import { useState, useCallback } from 'react';

interface LikeLimitModalState {
  isOpen: boolean;
  maxLikes: number;
  remainingTime?: string;
}

export function useLikeLimitModal() {
  const [modalState, setModalState] = useState<LikeLimitModalState>({
    isOpen: false,
    maxLikes: 4,
    remainingTime: '1 hour'
  });

  const showLikeLimit = useCallback((maxLikes: number, remainingTime?: string) => {
    setModalState({
      isOpen: true,
      maxLikes,
      remainingTime: remainingTime || '1 hour'
    });
  }, []);

  const hideLikeLimit = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  return {
    modalState,
    showLikeLimit,
    hideLikeLimit
  };
}
