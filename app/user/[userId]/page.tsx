"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, User, Calendar, MessageCircle, Users, Flag, ThumbsUp } from 'lucide-react';
import ReportUserModal from '@/components/user/ReportUserModal';

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
  onlineStatus: string;
  lastSeen: string | null;
  bio: string | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const userId = params.userId as string;

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/user/profile/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setLikesCount(data.user.likesCount || 0);
      } else {
        setError('User not found');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/user/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked);
        setLikesCount(data.likesCount);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleReportSubmit = async (reportData: { 
    reason: string; 
    category: string; 
    description?: string;
    attachments?: File[];
  }) => {
    if (!user) return;

    try {
      // Upload files first if any
      let uploadedAttachments = [];
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
            
            // Parse error response
            let errorMessage = `Failed to upload ${file.name}`;
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorMessage;
            } catch (e) {
              // Use default error message
            }
            
            throw new Error(errorMessage);
          }
          
          const uploadData = await uploadResponse.json();
          return uploadData;
        });
        
        uploadedAttachments = await Promise.all(uploadPromises);
      }

      // Submit the report
      const reportBody = {
        userId: user.id,
        reason: reportData.reason,
        category: reportData.category,
        description: reportData.description,
      } as any;
      
      // Only add attachments if they exist
      if (uploadedAttachments.length > 0) {
        reportBody.attachments = uploadedAttachments
          .map((result: any) => {
            const file = result?.file || result;
            return {
              fileName: file?.fileName || file?.name,
              fileSize: file?.fileSize ?? file?.size,
              fileType: file?.fileType || file?.type,
              s3Key: file?.s3Key || file?.key,
              s3Url: file?.s3Url || file?.url
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
        // You might want to show a success toast here
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
      console.error('Failed to submit report:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">User Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'The requested user could not be found.'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isCurrentUser = session?.user?.id === user.id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/20 bg-card/95 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-2xl font-semibold text-foreground">User Profile</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border/20 p-6">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || user.username || 'User'}
                      className="w-24 h-24 rounded-full"
                    />
                  ) : (
                    <User className="w-12 h-12 text-primary" />
                  )}
                </div>
                
                <div className="flex items-center justify-center gap-3 mb-1">
                  <h2 className="text-xl font-semibold text-foreground">
                    {user.name || user.username || 'Anonymous'}
                  </h2>
                  {!isCurrentUser && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLike}
                        className={`p-1 rounded-md transition-colors ${
                          isLiked 
                            ? 'text-blue-400 bg-blue-500/20' 
                            : 'text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10'
                        }`}
                        title={isLiked ? 'Unlike' : 'Like'}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleReport}
                        className="p-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Report User"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {user.username && user.name && (
                  <p className="text-muted-foreground text-sm mb-2">@{user.username}</p>
                )}

                {likesCount > 0 && (
                  <div className="flex items-center justify-center gap-1 mb-4">
                    <ThumbsUp className="w-3 h-3 text-blue-400" />
                    <span className="text-sm text-muted-foreground">{likesCount} likes</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full ${
                    user.onlineStatus === 'online' ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-sm text-muted-foreground capitalize">
                    {user.onlineStatus}
                  </span>
                </div>

                {isCurrentUser && (
                  <div className="px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">
                    You
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border/20 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Profile Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Display Name</p>
                    <p className="text-foreground">{user.name || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="text-foreground">@{user.username || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="text-foreground">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {user.bio && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bio</p>
                      <p className="text-foreground whitespace-pre-wrap">{user.bio}</p>
                    </div>
                  </div>
                )}

                {user.lastSeen && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Last Seen</p>
                      <p className="text-foreground">
                        {new Date(user.lastSeen).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isCurrentUser && (
              <div className="mt-6 bg-card/95 backdrop-blur-xl rounded-xl border border-border/20 p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
                
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    Send Message
                  </button>
                  
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
                    <Users className="w-4 h-4" />
                    Add Friend
                  </button>
                  
                  <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                    <Flag className="w-4 h-4" />
                    Report User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && user && (
        <ReportUserModal
          user={{
            id: user.id,
            name: user.name || user.username || 'Anonymous'
          }}
          onSubmit={handleReportSubmit}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
