'use client';
import { useState, useEffect } from 'react';
import { 
  Mail, 
  Reply, 
  Eye, 
  Clock, 
  User, 
  MessageSquare,
  Send,
  CheckCircle,
  X
} from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
  replies: Array<{
    id: string;
    message: string;
    sentToEmail: boolean;
    createdAt: string;
    admin: {
      name: string;
      email: string;
    };
  }>;
}

interface ContactInboxProps {
  className?: string;
}

export default function ContactInbox({ className = '' }: ContactInboxProps) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyData, setReplyData] = useState({ message: '', sendEmail: true });
  const [sendingReply, setSendingReply] = useState(false);
  
  useEffect(() => {
    fetchMessages();
  }, []);
  
  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/admin/contact');
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to fetch contact messages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReply = async () => {
    if (!selectedMessage || !replyData.message.trim()) return;
    
    setSendingReply(true);
    try {
      const response = await fetch('/api/admin/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactMessageId: selectedMessage.id,
          message: replyData.message,
          sendEmail: replyData.sendEmail
        })
      });
      
      if (response.ok) {
        setShowReplyModal(false);
        setReplyData({ message: '', sendEmail: true });
        fetchMessages();
        
        // Update selected message with new reply
        if (selectedMessage) {
          const updatedMessage = messages.find(m => m.id === selectedMessage.id);
          if (updatedMessage) {
            setSelectedMessage(updatedMessage);
          }
        }
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSendingReply(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  if (loading) {
    return (
      <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-[#1a1b23] border border-white/20 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Contact Messages</h2>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-white/70" />
          <span className="text-white/70 text-sm">{messages.length} messages</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages List */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Inbox</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                onClick={() => setSelectedMessage(message)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedMessage?.id === message.id
                    ? 'bg-[#00d9ff]/20 border-[#00d9ff]/30'
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-white">{message.subject}</h4>
                    <p className="text-sm text-white/70">{message.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {message.replies.length > 0 && (
                      <div title="Replied">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </div>
                    )}
                    <span className="text-xs text-white/50">
                      {new Date(message.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white/70 line-clamp-2">
                  {message.message.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Message Details */}
        <div>
          {selectedMessage ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Message Details</h3>
                <button
                  onClick={() => setShowReplyModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-white/70" />
                    <span className="text-white font-medium">{selectedMessage.user?.name || selectedMessage.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-white/70" />
                    <span className="text-white/70 text-sm">{selectedMessage.user?.email || selectedMessage.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-white/70" />
                    <span className="text-white/70 text-sm">{formatDate(selectedMessage.createdAt)}</span>
                  </div>
                  
                  <h4 className="text-white font-medium mb-2">{selectedMessage.subject}</h4>
                  <p className="text-white/90 whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
                
                {/* Replies */}
                {selectedMessage.replies.length > 0 && (
                  <div>
                    <h4 className="text-white font-medium mb-3">Replies ({selectedMessage.replies.length})</h4>
                    <div className="space-y-3">
                      {selectedMessage.replies.map((reply) => (
                        <div key={reply.id} className="p-4 bg-white/5 border border-white/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{reply.admin.name}</span>
                              {reply.sentToEmail && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                  Email Sent
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-white/50">
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-white/90 whitespace-pre-wrap">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a message</h3>
              <p className="text-white/70">Choose a message from the inbox to view details and reply.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Reply Modal */}
      {showReplyModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">Reply to {selectedMessage.user?.name || selectedMessage.name}</h3>
                  <p className="text-white/70 text-sm mt-1">{selectedMessage.user?.email || selectedMessage.email}</p>
                </div>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Original Message */}
            <div className="p-6 border-b border-white/20">
              <h4 className="text-sm font-medium text-white/70 mb-2">Original Message</h4>
              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-white">{selectedMessage.subject}</span>
                  <span className="text-xs text-white/50">
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-white/80 text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
            </div>
            
            {/* Reply Form */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Quick Reply Templates */}
                <div>
                  <label className="block text-sm text-white/70 mb-2">Quick Reply Templates</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Thank you for your message. We have received your inquiry and will get back to you soon.',
                      'We appreciate your feedback. Our team will review this and take appropriate action.',
                      'Thank you for contacting us. We have forwarded your message to the relevant department.',
                      'We have received your request and will process it within 24 hours.'
                    ].map((template, index) => (
                      <button
                        key={index}
                        onClick={() => setReplyData({ ...replyData, message: template })}
                        className="px-3 py-1 text-xs bg-white/10 text-white/70 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        Template {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Reply Message */}
                <div>
                  <label className="block text-sm text-white/70 mb-2">Reply Message</label>
                  <textarea
                    value={replyData.message}
                    onChange={(e) => setReplyData({ ...replyData, message: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 resize-none"
                    placeholder="Enter your reply..."
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-white/50">
                      {replyData.message.length} characters
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReplyData({ ...replyData, message: '' })}
                        className="text-xs text-white/50 hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Email Options */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={replyData.sendEmail}
                      onChange={(e) => setReplyData({ ...replyData, sendEmail: e.target.checked })}
                      className="w-4 h-4 text-[#00d9ff] bg-white/10 border-white/20 rounded focus:ring-[#00d9ff]/50"
                    />
                    <label htmlFor="sendEmail" className="text-white/70">
                      Send reply via email to {selectedMessage.email}
                    </label>
                  </div>
                  
                  {replyData.sendEmail && (
                    <div className="ml-7 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Email Preview</span>
                      </div>
                      <div className="text-xs text-white/70">
                        <p><strong>To:</strong> {selectedMessage.email}</p>
                        <p><strong>Subject:</strong> Re: {selectedMessage.subject}</p>
                        <p><strong>From:</strong> GeeksTalk Admin</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Character Count and Validation */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {replyData.message.length < 10 && (
                      <span className="text-yellow-400">Message seems too short</span>
                    )}
                    {replyData.message.length > 1000 && (
                      <span className="text-red-400">Message is quite long</span>
                    )}
                  </div>
                  <span className={`text-xs ${
                    replyData.message.length > 0 ? 'text-green-400' : 'text-white/50'
                  }`}>
                    {replyData.message.length > 0 ? 'Ready to send' : 'Enter a message'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="p-6 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Clock className="h-4 w-4" />
                  <span>Reply will be saved to conversation history</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowReplyModal(false)}
                    className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={sendingReply || !replyData.message.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingReply ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d9ff]"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
