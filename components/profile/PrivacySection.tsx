"use client";

import { useState, useEffect } from 'react';
import { Download, Trash2, Check, X } from 'lucide-react';

export default function PrivacySection() {
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public' as 'public' | 'friends' | 'private',
    showOnlineStatus: true,
    dmPermissions: 'everyone' as 'everyone' | 'friends' | 'nobody',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load privacy settings on component mount
  useEffect(() => {
    const loadPrivacySettings = async () => {
      try {
        const response = await fetch('/api/user/privacy');
        if (response.ok) {
          const data = await response.json();
          setPrivacy({
            profileVisibility: data.profileVisibility,
            showOnlineStatus: data.showOnlineStatus,
            dmPermissions: data.dmPermissions,
          });
        }
      } catch (error) {
        console.error('Error loading privacy settings:', error);
        setError('Failed to load privacy settings');
      } finally {
        setLoading(false);
      }
    };

    loadPrivacySettings();
  }, []);

  // Save privacy settings
  const savePrivacySettings = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(privacy),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Download user data
  const downloadUserData = async () => {
    setDownloading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/user/data-download');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geeks-talk-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to download data');
      }
    } catch (error) {
      console.error('Error downloading data:', error);
      setError('Failed to download data');
    } finally {
      setDownloading(false);
    }
  };

  // Delete account
  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmDeletion: true }),
      });

      if (response.ok) {
        // Redirect to home page after successful deletion
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Privacy & Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control who can see your information and contact you
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Profile visibility
          </label>
          <div className="flex flex-wrap gap-2">
            {(['public', 'friends', 'private'] as const).map((vis) => (
              <button
                key={vis}
                onClick={() => setPrivacy(prev => ({ ...prev, profileVisibility: vis }))}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                  privacy.profileVisibility === vis
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card/30 border border-border/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                {vis}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Who can view your profile and activity
          </p>
        </div>

        <div className="h-px bg-border/20" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor="online-status" className="block text-sm font-medium text-foreground">
              Show online status
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Let others see when you're online
            </p>
          </div>
          <button
            id="online-status"
            role="switch"
            aria-checked={privacy.showOnlineStatus}
            onClick={() => setPrivacy(prev => ({ ...prev, showOnlineStatus: !prev.showOnlineStatus }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
              privacy.showOnlineStatus ? 'bg-primary' : 'bg-muted/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                privacy.showOnlineStatus ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-border/20" />

        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Who can send you DMs
          </label>
          <div className="flex flex-wrap gap-2">
            {(['everyone', 'friends', 'nobody'] as const).map((perm) => (
              <button
                key={perm}
                onClick={() => setPrivacy(prev => ({ ...prev, dmPermissions: perm }))}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                  privacy.dmPermissions === perm
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card/30 border border-border/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                {perm}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Control who can start a direct message conversation with you
          </p>
        </div>

        <div className="h-px bg-border/20" />

        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Data management</h3>
          <div className="space-y-3">
            <button 
              onClick={downloadUserData}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card/30 border border-border/20 text-foreground hover:bg-card/50 transition w-full sm:w-auto disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">{downloading ? 'Preparing download...' : 'Download your data'}</span>
            </button>
            <p className="text-xs text-muted-foreground">
              Request a copy of your personal data
            </p>
          </div>
        </div>

        <div className="h-px bg-border/20" />

        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Danger zone</h3>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">Delete account</span>
            </button>
          ) : (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-foreground mb-3">
                Are you sure? This action cannot be undone. All your data will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-card/30 border border-border/20 text-foreground hover:bg-card/50 transition text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition text-sm disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Permanently delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-2">
          <X className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-500">{error}</span>
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-500">Settings saved successfully!</span>
        </div>
      )}

      <div className="pt-4">
        <button 
          onClick={savePrivacySettings}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}

