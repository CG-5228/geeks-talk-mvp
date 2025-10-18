"use client";
import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface StyledDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  showCloseButton?: boolean;
  autoClose?: number; // Auto close after X milliseconds
}

export default function StyledDialog({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  showCloseButton = true,
  autoClose,
}: StyledDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (autoClose && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/20';
      case 'error':
        return 'border-red-500/20';
      case 'warning':
        return 'border-yellow-500/20';
      default:
        return 'border-blue-500/20';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10';
      case 'error':
        return 'bg-red-500/10';
      case 'warning':
        return 'bg-yellow-500/10';
      default:
        return 'bg-blue-500/10';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div 
        className={`relative transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className={`
          relative max-w-md w-full mx-4 p-6 rounded-xl border
          ${getBorderColor()} ${getBackgroundColor()}
          bg-card/95 backdrop-blur-xl shadow-2xl
        `}>
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            {getIcon()}
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {title}
                </h3>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {message}
              </p>
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for easy usage
export function useStyledDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    autoClose?: number;
  }>({
    isOpen: false,
    message: '',
  });

  const showDialog = (options: {
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    autoClose?: number;
  }) => {
    setDialog({
      isOpen: true,
      ...options,
    });
  };

  const hideDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const DialogComponent = () => (
    <StyledDialog
      isOpen={dialog.isOpen}
      onClose={hideDialog}
      title={dialog.title}
      message={dialog.message}
      type={dialog.type}
      autoClose={dialog.autoClose}
    />
  );

  return {
    showDialog,
    hideDialog,
    DialogComponent,
  };
}
