"use client";
import { useState, useEffect, useRef } from 'react';

interface AudibleAlertIconProps {
  isSpeaking: boolean;
  volume?: number; // 0-1, where 1 is maximum volume
  userId: string;
  className?: string;
}

export default function AudibleAlertIcon({ isSpeaking, volume = 0, userId, className = "" }: AudibleAlertIconProps) {
  const [displayVolume, setDisplayVolume] = useState(0);
  const animationRef = useRef<number>();

  // Smooth volume animation
  useEffect(() => {
    if (isSpeaking && volume > 0) {
      // Animate to the target volume
      const animate = () => {
        setDisplayVolume(prev => {
          const diff = volume - prev;
          const newVolume = prev + diff * 0.3; // Smooth interpolation
          
          if (Math.abs(diff) > 0.01) {
            animationRef.current = requestAnimationFrame(animate);
          }
          
          return newVolume;
        });
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Fade out when not speaking
      const fadeOut = () => {
        setDisplayVolume(prev => {
          const newVolume = prev * 0.8; // Fade out
          
          if (newVolume > 0.01) {
            animationRef.current = requestAnimationFrame(fadeOut);
          } else {
            setDisplayVolume(0);
          }
          
          return newVolume;
        });
      };
      
      animationRef.current = requestAnimationFrame(fadeOut);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpeaking, volume]);

  // Simple test version - always show something for debugging
  const isCurrentlySpeaking = isSpeaking || displayVolume > 0.01;
  
  if (!isCurrentlySpeaking) {
    return null;
  }

  // Calculate number of lines to show (1-3) - very low thresholds for testing
  const getLineCount = (vol: number) => {
    if (vol < 0.05) return 1;  // Very low threshold
    if (vol < 0.2) return 2;   // Low threshold
    return 3;
  };

  const lineCount = getLineCount(displayVolume);
  const intensity = Math.min(displayVolume * 2, 1); // Boost intensity

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3].map((line) => (
        <div
          key={line}
          className={`transition-all duration-150 ease-out ${
            line <= lineCount 
              ? 'bg-green-400' 
              : 'bg-gray-400/30'
          }`}
          style={{
            width: '2px',
            height: line === 1 ? '4px' : line === 2 ? '6px' : '8px',
            borderRadius: '1px',
            opacity: line <= lineCount ? 0.8 : 0.3,
            transform: line <= lineCount ? `scaleY(1)` : 'scaleY(0.5)',
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  );
}

// Alternative version with more dynamic animation
export function DynamicAudibleAlertIcon({ isSpeaking, volume = 0, userId, className = "" }: AudibleAlertIconProps) {
  const [displayVolume, setDisplayVolume] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (isSpeaking && volume > 0) {
      setIsAnimating(true);
      setDisplayVolume(volume);
    } else {
      // Start fade out animation
      const fadeOut = () => {
        setDisplayVolume(prev => {
          const newVolume = prev * 0.85;
          
          if (newVolume > 0.05) {
            animationRef.current = requestAnimationFrame(fadeOut);
            return newVolume;
          } else {
            setIsAnimating(false);
            return 0;
          }
        });
      };
      
      animationRef.current = requestAnimationFrame(fadeOut);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpeaking, volume]);

  // Don't render if not speaking and not animating
  if (!isSpeaking && !isAnimating) {
    return null;
  }

  const lineCount = Math.ceil(displayVolume * 3);
  const baseHeight = 3;
  const maxHeight = 8;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3].map((line) => {
        const isActive = line <= lineCount;
        const height = isActive 
          ? baseHeight + (displayVolume * (maxHeight - baseHeight) * (line / 3))
          : baseHeight * 0.3;
        
        return (
          <div
            key={line}
            className={`transition-all duration-100 ease-out ${
              isActive 
                ? 'bg-green-400 shadow-sm' 
                : 'bg-gray-400/20'
            }`}
            style={{
              width: '2px',
              height: `${height}px`,
              borderRadius: '1px',
              opacity: isActive ? 0.7 + (displayVolume * 0.3) : 0.2,
              transform: isActive ? `scaleY(${0.9 + displayVolume * 0.2})` : 'scaleY(0.3)',
              transformOrigin: 'bottom',
              boxShadow: isActive ? '0 0 4px rgba(34, 197, 94, 0.3)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

// Simple version for basic usage
export function SimpleAudibleAlertIcon({ isSpeaking, volume = 0, userId, className = "" }: AudibleAlertIconProps) {
  if (!isSpeaking) return null;

  const lineCount = Math.ceil(volume * 3);
  
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3].map((line) => (
        <div
          key={line}
          className={`w-0.5 rounded-full transition-all duration-200 ${
            line <= lineCount 
              ? 'bg-green-400 h-2' 
              : 'bg-gray-400/30 h-1'
          }`}
        />
      ))}
    </div>
  );
}
