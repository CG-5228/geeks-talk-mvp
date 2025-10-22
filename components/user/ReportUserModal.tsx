"use client";
import { useState, useRef } from 'react';
import { Flag, X, Upload, File, Trash2 } from 'lucide-react';
import { useNotifications } from '@/components/ui/NotificationSystem';

interface ReportUserModalProps {
  user: {
    id: string;
    name: string;
    image?: string | null;
  };
  onSubmit: (data: {
    reason: string;
    category: string;
    description?: string;
    attachments?: File[];
  }) => Promise<void>;
  onClose: () => void;
}

const REPORT_CATEGORIES = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other' },
];

export default function ReportUserModal({ user, onSubmit, onClose }: ReportUserModalProps) {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotifications();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
      
      if (file.size > maxSize) {
        showNotification({
          title: 'File Too Large',
          message: `${file.name} is too large. Maximum size is 10MB.`,
          type: 'error'
        });
        return false;
      }
      
      if (!allowedTypes.includes(file.type)) {
        showNotification({
          title: 'Invalid File Type',
          message: `${file.name} is not a supported file type.`,
          type: 'error'
        });
        return false;
      }
      
      return true;
    });
    
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim() || !category) {
      showNotification({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        reason: reason.trim(),
        category,
        description: description.trim() || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      
      showNotification({
        title: 'Report Submitted',
        message: 'Your report has been submitted successfully. Our moderation team will review it.',
        type: 'success'
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
      const message = error instanceof Error && error.message ? error.message : 'Failed to submit report. Please try again.';
      showNotification({
        title: 'Submission Failed',
        message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[color:var(--nav-bg)] border border-border/20 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <Flag className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-[rgba(220,235,255,0.9)]">
              Report User
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-[rgba(220,235,255,0.7)] mb-2">
              Reporting: <span className="font-medium text-[rgba(220,235,255,0.9)]">{user.name}</span>
            </p>
            <p className="text-xs text-[rgba(220,235,255,0.6)]">
              Please provide details about the issue. Our moderation team will review your report.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[rgba(220,235,255,0.8)] mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[color:var(--chat-bg)] border border-border/20 rounded-md text-[rgba(220,235,255,0.9)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              >
                <option value="">Select a category</option>
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-[rgba(220,235,255,0.8)] mb-2">
                Reason *
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full px-3 py-2 bg-[color:var(--chat-bg)] border border-border/20 rounded-md text-[rgba(220,235,255,0.9)] placeholder-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[rgba(220,235,255,0.8)] mb-2">
                Additional Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any additional context or details..."
                rows={3}
                className="w-full px-3 py-2 bg-[color:var(--chat-bg)] border border-border/20 rounded-md text-[rgba(220,235,255,0.9)] placeholder-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-[rgba(220,235,255,0.8)] mb-2">
                Proof/Evidence (Optional)
              </label>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*,.heic,.heif,.pdf,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border/30 rounded-md text-[rgba(220,235,255,0.7)] hover:border-blue-500/50 hover:text-[rgba(220,235,255,0.9)] transition-colors"
                >
                  <Upload size={16} />
                  <span>Upload Files (Images, PDF, Text)</span>
                </button>
                
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-[rgba(220,235,255,0.6)]">
                      Attached files ({attachments.length}):
                    </p>
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-[color:var(--chat-bg)] border border-border/20 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <File size={14} className="text-[rgba(220,235,255,0.6)]" />
                          <div>
                            <p className="text-sm text-[rgba(220,235,255,0.9)] truncate max-w-[200px]">
                              {file.name}
                            </p>
                            <p className="text-xs text-[rgba(220,235,255,0.5)]">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-[rgba(220,235,255,0.7)] bg-white/5 hover:bg-white/10 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim() || !category}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}