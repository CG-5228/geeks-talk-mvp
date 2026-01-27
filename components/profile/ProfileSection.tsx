"use client";

import { useState } from 'react';
import AvatarUploader from './AvatarUploader';

export default function ProfileSection({ 
  initialUsername, 
  initialBio,
  initialDisplayName,
  email,
  avatarUrl 
}: { 
  initialUsername: string; 
  initialBio?: string | null;
  initialDisplayName?: string | null;
  email: string | null;
  avatarUrl: string | null;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [bio, setBio] = useState(initialBio || '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setPending(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, bio }),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        const data = await res.json().catch(() => ({}));
        // Handle both string errors and error objects (defensive)
        let errorText = 'Failed to update profile';
        if (data.error) {
          if (typeof data.error === 'string') {
            errorText = data.error;
          } else if (typeof data.error === 'object' && data.error !== null) {
            // Handle Zod error objects
            if (data.error.formErrors && Array.isArray(data.error.formErrors) && data.error.formErrors.length > 0) {
              errorText = data.error.formErrors[0];
            } else if (data.error.fieldErrors?.username && Array.isArray(data.error.fieldErrors.username) && data.error.fieldErrors.username.length > 0) {
              errorText = data.error.fieldErrors.username[0];
            } else {
              errorText = 'Invalid input. Please check your username format.';
            }
          }
        }
        setMessage({ type: 'error', text: errorText });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
    
    setPending(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your public profile information
        </p>
      </div>

      <div className="flex justify-center">
        <AvatarUploader initialUrl={avatarUrl} />
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={30}
            className="w-full rounded-lg px-4 py-2.5 bg-card/30 border border-border/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Your unique identifier. Max 30 characters.
          </p>
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-2">
            Display name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder="How you'd like to be called"
            className="w-full rounded-lg px-4 py-2.5 bg-card/30 border border-border/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-2">
            Bio <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Tell us about yourself..."
            className="w-full rounded-lg px-4 py-2.5 bg-card/30 border border-border/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {bio.length}/200 characters
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email || ''}
            readOnly
            className="w-full rounded-lg px-4 py-2.5 bg-muted/20 border border-border/20 text-muted-foreground cursor-not-allowed"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Email cannot be changed directly. Contact support if needed.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving...' : 'Save changes'}
        </button>
        
        {message && (
          <div className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

