'use client';
import { useState, useEffect } from 'react';
import { 
  Bug, 
  Reply, 
  Eye, 
  Clock, 
  User, 
  MessageSquare,
  Send,
  CheckCircle,
  X,
  AlertTriangle
} from 'lucide-react';

interface BugReport {
  id: string;
  title: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  steps: string;
  expected: string;
  actual: string;
  environment?: string;
  pagePath: string;
  screenshotUrl?: string;
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

interface BugInboxProps {
  className?: string;
}

export default function BugInbox({ className = '' }: BugInboxProps) {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyData, setReplyData] = useState({ message: '', sendEmail: true });
  const [sendingReply, setSendingReply] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'resolved' | 'closed'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('all');
  
  useEffect(() => {
    fetchBugs();
  }, []);
  
  const fetchBugs = async () => {
    try {
      const response = await fetch('/api/admin/bugs');
      const data = await response.json();
      setBugs(data.bugs || []);
    } catch (error) {
      console.error('Failed to fetch bug reports:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReply = async () => {
    if (!selectedBug || !replyData.message.trim()) return;
    
    setSendingReply(true);
    try {
      const response = await fetch('/api/admin/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bugReportId: selectedBug.id,
          message: replyData.message,
          sendEmail: replyData.sendEmail
        })
      });
      
      if (response.ok) {
        setShowReplyModal(false);
        setReplyData({ message: '', sendEmail: true });
        fetchBugs();
        
        // Update selected bug with new reply
        if (selectedBug) {
          const updatedBug = bugs.find(b => b.id === selectedBug.id);
          if (updatedBug) {
            setSelectedBug(updatedBug);
          }
        }
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  const updateBugStatus = async (bugId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bugId,
          status
        })
      });
      
      if (response.ok) {
        fetchBugs();
        if (selectedBug && selectedBug.id === bugId) {
          setSelectedBug({ ...selectedBug, status: status as any });
        }
      }
    } catch (error) {
      console.error('Failed to update bug status:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/20';
      case 'HIGH': return 'text-orange-400 bg-orange-500/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20';
      case 'LOW': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-400 bg-red-500/20';
      case 'in-progress': return 'text-blue-400 bg-blue-500/20';
      case 'resolved': return 'text-green-400 bg-green-500/20';
      case 'closed': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const filteredBugs = bugs.filter(bug => {
    const statusMatch = filter === 'all' || bug.status === filter;
    const severityMatch = severityFilter === 'all' || bug.severity === severityFilter;
    return statusMatch && severityMatch;
  });
  
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
        <h2 className="text-xl font-semibold text-white">Bug Reports</h2>
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-white/70" />
          <span className="text-white/70 text-sm">{bugs.length} reports</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bugs List */}
        <div className="lg:col-span-1">
          {/* Filters */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {(['all', 'open', 'in-progress', 'resolved', 'closed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    filter === status
                      ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {status.replace('-', ' ')}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSeverityFilter(severity)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    severityFilter === severity
                      ? 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredBugs.map((bug) => (
              <div
                key={bug.id}
                onClick={() => setSelectedBug(bug)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedBug?.id === bug.id
                    ? 'bg-[#00d9ff]/20 border-[#00d9ff]/30'
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{bug.title}</span>
                    <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(bug.severity)}`}>
                      {bug.severity}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(bug.status)}`}>
                    {bug.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-white/50" />
                    <span className="text-xs text-white/50">{bug.user?.name || 'Unknown'}</span>
                  </div>
                  <span className="text-xs text-white/50">
                    {new Date(bug.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-white/70 line-clamp-2 mt-1">
                  {bug.description ? bug.description.substring(0, 100) + '...' : bug.title}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bug Details */}
        <div className="lg:col-span-2">
          {selectedBug ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Bug Details</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedBug.status}
                    onChange={(e) => updateBugStatus(selectedBug.id, e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button
                    onClick={() => setShowReplyModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors"
                  >
                    <Reply className="h-4 w-4" />
                    Reply
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-white/70" />
                    <span className="text-white font-medium">{selectedBug.user?.name || selectedBug.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="h-4 w-4 text-white/70" />
                    <span className="text-white/70 text-sm">{selectedBug.user?.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-white/70" />
                    <span className="text-white/70 text-sm">{formatDate(selectedBug.createdAt)}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-white/70">Severity:</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${getSeverityColor(selectedBug.severity)}`}>
                        {selectedBug.severity}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-white/70">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(selectedBug.status)}`}>
                        {selectedBug.status}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-white font-medium mb-2">{selectedBug.title}</h4>
                  {selectedBug.description && (
                    <p className="text-white/90 whitespace-pre-wrap mb-4">{selectedBug.description}</p>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-white/70 mb-1">Page Path:</h5>
                      <p className="text-white/80 text-sm">{selectedBug.pagePath}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-white/70 mb-1">Steps to Reproduce:</h5>
                      <p className="text-white/80 text-sm whitespace-pre-wrap">{selectedBug.steps}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-white/70 mb-1">Expected Behavior:</h5>
                      <p className="text-white/80 text-sm whitespace-pre-wrap">{selectedBug.expected}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-white/70 mb-1">Actual Behavior:</h5>
                      <p className="text-white/80 text-sm whitespace-pre-wrap">{selectedBug.actual}</p>
                    </div>
                    {selectedBug.environment && (
                      <div>
                        <h5 className="text-sm font-medium text-white/70 mb-1">Environment:</h5>
                        <p className="text-white/80 text-sm whitespace-pre-wrap">{selectedBug.environment}</p>
                      </div>
                    )}
                    {selectedBug.screenshotUrl && (
                      <div>
                        <h5 className="text-sm font-medium text-white/70 mb-1">Screenshot:</h5>
                        <img 
                          src={selectedBug.screenshotUrl} 
                          alt="Bug screenshot" 
                          className="max-w-full h-auto rounded-lg border border-white/20"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Replies */}
                {selectedBug.replies.length > 0 && (
                  <div>
                    <h4 className="text-white font-medium mb-3">Replies ({selectedBug.replies.length})</h4>
                    <div className="space-y-3">
                      {selectedBug.replies.map((reply) => (
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
              <Bug className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a bug report</h3>
              <p className="text-white/70">Choose a bug report from the list to view details and reply.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Reply Modal */}
      {showReplyModal && selectedBug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1b23] border border-white/20 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">Reply to {selectedBug.user?.name || selectedBug.title}</h3>
                  <p className="text-white/70 text-sm mt-1">{selectedBug.user?.email || 'No email'}</p>
                </div>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Original Bug Report */}
            <div className="p-6 border-b border-white/20">
              <h4 className="text-sm font-medium text-white/70 mb-2">Original Bug Report</h4>
              <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-white">{selectedBug.title}</span>
                  <span className="text-xs text-white/50">
                    {new Date(selectedBug.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-white/80 text-sm whitespace-pre-wrap">{selectedBug.description || selectedBug.title}</p>
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
                      'Thank you for reporting this bug. We have reproduced the issue and are working on a fix.',
                      'We have identified the root cause and a fix will be included in the next update.',
                      'This issue has been resolved. Please update to the latest version.',
                      'We are investigating this issue and will provide an update soon.'
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
                    placeholder="Type your reply here..."
                    className="w-full h-32 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#00d9ff]/50 resize-none"
                  />
                </div>
                
                {/* Email Options */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={replyData.sendEmail}
                    onChange={(e) => setReplyData({ ...replyData, sendEmail: e.target.checked })}
                    className="w-4 h-4 text-[#00d9ff] bg-white/5 border-white/20 rounded focus:ring-[#00d9ff]/50"
                  />
                  <label htmlFor="sendEmail" className="text-sm text-white/70">
                    Send email notification to reporter
                  </label>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-white/20 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowReplyModal(false)}
                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={!replyData.message.trim() || sendingReply}
                className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReply ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d9ff]"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Reply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
