"use client";
import { useState, useRef } from 'react';
import { Flag, Upload, X, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../ui/NotificationSystem';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    name: string | null;
    username: string | null;
  };
  groupId: string;
}

const REPORT_REASONS = [
  { value: 'inappropriate_behavior', label: 'Inappropriate Behavior' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'fake_account', label: 'Fake Account' },
  { value: 'other', label: 'Other' },
];

export default function ReportDialog({ isOpen, onClose, targetUser, groupId }: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotifications();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification({
          title: 'File Too Large',
          message: `${file.name} is too large. Maximum size is 5MB.`,
          type: 'error',
          duration: 4000,
        });
        return false;
      }
      
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'video/mp4',
        'video/webm',
      ];
      
      if (!allowedTypes.includes(file.type)) {
        showNotification({
          title: 'File Type Not Supported',
          message: `${file.name} has an unsupported file type.`,
          type: 'error',
          duration: 4000,
        });
        return false;
      }
      
      return true;
    });
    
    setEvidenceFiles(prev => [...prev, ...validFiles].slice(0, 3)); // Max 3 files
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      showNotification({
        title: 'Reason Required',
        message: 'Please select a reason for reporting this user.',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      showNotification({
        title: 'Custom Reason Required',
        message: 'Please provide a custom reason for reporting this user.',
        type: 'error',
        duration: 4000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('targetUserId', targetUser.id);
      formData.append('reason', selectedReason === 'other' ? customReason : selectedReason);
      formData.append('details', additionalDetails);
      formData.append('groupId', groupId);
      
      // Add evidence files
      evidenceFiles.forEach((file, index) => {
        formData.append(`evidence_${index}`, file);
      });

      const response = await fetch(`/api/voice/groups/${groupId}/report`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        showNotification({
          title: 'Report Submitted',
          message: `Your report about ${targetUser.name || targetUser.username || 'this user'} has been submitted successfully.`,
          type: 'success',
          duration: 5000,
        });
        handleClose();
      } else {
        const error = await response.json();
        showNotification({
          title: 'Report Failed',
          message: error.error || 'Failed to submit report. Please try again.',
          type: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to submit report. Please check your connection and try again.',
        type: 'error',
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    setAdditionalDetails('');
    setEvidenceFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative max-w-md w-full mx-4 p-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 bg-card/95 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Report User
            </h3>
            <p className="text-sm text-muted-foreground">
              Report {targetUser.name || targetUser.username || 'this user'} for review by administrators.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason for Report *
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label key={reason.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-primary bg-transparent border-border/20 focus:ring-primary/50"
                  />
                  <span className="text-sm text-foreground">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Reason */}
          {selectedReason === 'other' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Please specify the reason *
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the reason for reporting..."
                className="w-full px-3 py-2 text-sm bg-white/5 border border-border/20 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={200}
              />
            </div>
          )}

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Additional Details (Optional)
            </label>
            <textarea
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="Provide any additional context or details..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-white/5 border border-border/20 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {additionalDetails.length}/500 characters
            </p>
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Evidence (Optional)
            </label>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.txt,video/mp4,video/webm"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={evidenceFiles.length >= 3}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white/5 border border-border/20 rounded-lg text-foreground hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Upload Evidence ({evidenceFiles.length}/3)
              </button>
              
              {evidenceFiles.length > 0 && (
                <div className="space-y-1">
                  {evidenceFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                      <span className="text-xs text-foreground truncate flex-1">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Supported: Images, PDF, Text, Video (max 5MB each, 3 files total)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-border/20 text-foreground rounded-lg hover:bg-white/10 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Flag className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
