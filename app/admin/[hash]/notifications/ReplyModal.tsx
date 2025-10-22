"use client";
import { useState } from 'react';
import { X, Send, User, Mail, MessageSquare, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

const QUICK_REPLY_TEMPLATES = [
  {
    id: 'template1',
    title: 'Template 1',
    content: 'Thank you for your report. We have received it and will review it shortly. We appreciate you helping us maintain a safe community.'
  },
  {
    id: 'template2', 
    title: 'Template 2',
    content: 'We have reviewed your report and taken appropriate action. Thank you for bringing this to our attention.'
  },
  {
    id: 'template3',
    title: 'Template 3', 
    content: 'Your report has been investigated and the matter has been resolved. We appreciate your patience.'
  },
  {
    id: 'template4',
    title: 'Template 4',
    content: 'Thank you for your feedback. We are continuously working to improve our platform and your input is valuable.'
  }
];

export default function ReplyModal({ userId, userName, onClose, originalMessage }: { 
  userId: string; 
  userName?: string; 
  onClose: () => void;
  originalMessage?: string;
}) {
  const [subject, setSubject] = useState('Re: Your report');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const applyTemplate = (template: typeof QUICK_REPLY_TEMPLATES[0]) => {
    setMessage(template.content);
    setSelectedTemplate(template.id);
  };

  const clearMessage = () => {
    setMessage('');
    setSelectedTemplate(null);
  };

  const send = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject, 
          message,
          sendEmail 
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send message');
      setSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#1a1b23] border border-white/20 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h3 className="text-xl font-semibold text-white">Reply to {userName || 'user'}</h3>
            <p className="text-sm text-white/70">{userId}@example.com</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {sent ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <span className="text-xl font-semibold text-white">Message Sent Successfully</span>
              </div>
              <p className="text-white/70 mb-6">Your message has been delivered to {userName || 'the user'}.</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 text-[#00d9ff] rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Original Message Context */}
              {originalMessage && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <h4 className="text-lg font-medium text-white mb-3">Original Message</h4>
                  <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-white/90">{originalMessage}</p>
                  </div>
                </div>
              )}

              {/* Quick Reply Templates */}
              <div className="space-y-3">
                <h4 className="text-lg font-medium text-white">Quick Reply Templates</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {QUICK_REPLY_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedTemplate === template.id
                          ? 'bg-[#00d9ff]/20 border-[#00d9ff]/50 text-[#00d9ff]'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="text-sm font-medium">{template.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply Message */}
              <div className="space-y-3">
                <h4 className="text-lg font-medium text-white">Reply Message</h4>
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 focus:border-transparent transition-all resize-none"
                    placeholder="Enter your reply..."
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-white/50">
                      {message.length} characters
                    </span>
                    <button
                      onClick={clearMessage}
                      className="text-xs text-white/50 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 text-[#00d9ff] bg-white/10 border-white/20 rounded focus:ring-[#00d9ff]/50"
                  />
                  <span className="text-white">Send reply via email to {userName || 'user'}</span>
                </label>

                {sendEmail && (
                  <div className="p-4 bg-[#00d9ff]/10 border border-[#00d9ff]/20 rounded-lg">
                    <h5 className="text-sm font-medium text-white/70 mb-2">Email Preview</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white/70">To:</span>
                        <span className="text-white">{userName || 'user@example.com'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/70">Subject:</span>
                        <span className="text-white">{subject}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/70">From:</span>
                        <span className="text-white">GeeksTalk Admin</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Validation Error */}
              {message.length > 0 && message.length < 10 && (
                <div className="text-red-400 text-sm">Message seems too short</div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <div className="flex justify-between items-center p-6 border-t border-white/10">
            <div className="text-sm text-white/70">
              Reply will be saved to conversation history
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending || !message.trim() || message.length < 10}
                className="px-6 py-2 bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enter a message
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
