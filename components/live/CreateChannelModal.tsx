"use client";

import { useState } from 'react';
import { X, Hash, Lock, Users, Eye, EyeOff, Info, Shield, Settings } from 'lucide-react';

interface ChannelSettings {
  name: string;
  description: string;
  isPrivate: boolean;
  password: string;
  inviteOnly: boolean;
  allowMemberInvites: boolean;
  slowMode: number; // seconds
  maxMembers: number;
}

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (settings: ChannelSettings) => Promise<void>;
}

export default function CreateChannelModal({ open, onClose, onCreate }: CreateChannelModalProps) {
  const [settings, setSettings] = useState<ChannelSettings>({
    name: '',
    description: '',
    isPrivate: false,
    password: '',
    inviteOnly: false,
    allowMemberInvites: true,
    slowMode: 0,
    maxMembers: 0
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!settings.name.trim()) {
      newErrors.name = 'Channel name is required';
    } else if (settings.name.length < 2) {
      newErrors.name = 'Channel name must be at least 2 characters';
    } else if (settings.name.length > 50) {
      newErrors.name = 'Channel name must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(settings.name)) {
      newErrors.name = 'Channel name can only contain letters, numbers, hyphens, and underscores';
    }

    if (settings.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (settings.isPrivate && settings.password && settings.password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    if (settings.maxMembers > 0 && settings.maxMembers < 2) {
      newErrors.maxMembers = 'Maximum members must be at least 2';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onCreate(settings);
      handleClose();
    } catch (error) {
      console.error('Failed to create channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSettings({
      name: '',
      description: '',
      isPrivate: false,
      password: '',
      inviteOnly: false,
      allowMemberInvites: true,
      slowMode: 0,
      maxMembers: 0
    });
    setErrors({});
    setShowPassword(false);
    onClose();
  };

  const updateSetting = <K extends keyof ChannelSettings>(key: K, value: ChannelSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[color:var(--nav-bg)]/98 backdrop-blur-2xl rounded-xl border border-border/20 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Hash className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[rgba(236,245,255,0.95)]">Create Channel</h2>
              <p className="text-sm text-[rgba(220,235,255,0.7)]">Set up your new channel with custom settings</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[rgba(236,245,255,0.95)] flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Basic Settings
            </h3>

            {/* Channel Name */}
            <div>
              <label htmlFor="channel-name" className="block text-sm font-medium text-[rgba(236,245,255,0.9)] mb-2">
                Channel Name *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.5)]" />
                <input
                  id="channel-name"
                  type="text"
                  value={settings.name}
                  onChange={(e) => updateSetting('name', e.target.value)}
                  placeholder="general"
                  className={`w-full pl-10 pr-3 py-3 rounded-lg bg-white/5 border transition-colors text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    errors.name ? 'border-red-500/50' : 'border-border/20'
                  }`}
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
              <p className="mt-1 text-xs text-[rgba(220,235,255,0.6)]">
                Channel names can only contain letters, numbers, hyphens, and underscores
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="channel-description" className="block text-sm font-medium text-[rgba(236,245,255,0.9)] mb-2">
                Description
              </label>
              <textarea
                id="channel-description"
                value={settings.description}
                onChange={(e) => updateSetting('description', e.target.value)}
                placeholder="What's this channel about?"
                rows={3}
                className={`w-full px-3 py-3 rounded-lg bg-white/5 border transition-colors text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none ${
                  errors.description ? 'border-red-500/50' : 'border-border/20'
                }`}
              />
              {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
              <p className="mt-1 text-xs text-[rgba(220,235,255,0.6)]">
                {settings.description.length}/500 characters
              </p>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[rgba(236,245,255,0.95)] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy & Access
            </h3>

            {/* Private Channel */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-border/20">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-[rgba(220,235,255,0.7)]" />
                <div>
                  <div className="font-medium text-[rgba(236,245,255,0.95)]">Private Channel</div>
                  <div className="text-sm text-[rgba(220,235,255,0.7)]">
                    Only invited members can see and join this channel
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.isPrivate}
                  onChange={(e) => updateSetting('isPrivate', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Password Protection */}
            {settings.isPrivate && (
              <div>
                <label htmlFor="channel-password" className="block text-sm font-medium text-[rgba(236,245,255,0.9)] mb-2">
                  Password Protection
                </label>
                <div className="relative">
                  <input
                    id="channel-password"
                    type={showPassword ? 'text' : 'password'}
                    value={settings.password}
                    onChange={(e) => updateSetting('password', e.target.value)}
                    placeholder="Optional password for additional security"
                    className={`w-full px-3 py-3 pr-10 rounded-lg bg-white/5 border transition-colors text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      errors.password ? 'border-red-500/50' : 'border-border/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(220,235,255,0.5)] hover:text-[rgba(220,235,255,0.8)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                <p className="mt-1 text-xs text-[rgba(220,235,255,0.6)]">
                  Leave empty for no password protection
                </p>
              </div>
            )}

            {/* Invite Only */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-border/20">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[rgba(220,235,255,0.7)]" />
                <div>
                  <div className="font-medium text-[rgba(236,245,255,0.95)]">Invite Only</div>
                  <div className="text-sm text-[rgba(220,235,255,0.7)]">
                    Only you can invite new members to this channel
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.inviteOnly}
                  onChange={(e) => updateSetting('inviteOnly', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Allow Member Invites */}
            {!settings.inviteOnly && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-border/20">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[rgba(220,235,255,0.7)]" />
                  <div>
                    <div className="font-medium text-[rgba(236,245,255,0.95)]">Allow Member Invites</div>
                    <div className="text-sm text-[rgba(220,235,255,0.7)]">
                      Members can invite other users to this channel
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowMemberInvites}
                    onChange={(e) => updateSetting('allowMemberInvites', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[rgba(236,245,255,0.95)] flex items-center gap-2">
              <Info className="w-4 h-4" />
              Advanced Settings
            </h3>

            {/* Slow Mode */}
            <div>
              <label htmlFor="slow-mode" className="block text-sm font-medium text-[rgba(236,245,255,0.9)] mb-2">
                Slow Mode
              </label>
              <select
                id="slow-mode"
                value={settings.slowMode}
                onChange={(e) => updateSetting('slowMode', parseInt(e.target.value))}
                className="w-full px-3 py-3 rounded-lg bg-white/5 border border-border/20 text-[rgba(236,245,255,0.95)] focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value={0}>Off</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={900}>15 minutes</option>
              </select>
              <p className="mt-1 text-xs text-[rgba(220,235,255,0.6)]">
                Prevent users from sending messages too frequently
              </p>
            </div>

            {/* Max Members */}
            <div>
              <label htmlFor="max-members" className="block text-sm font-medium text-[rgba(236,245,255,0.9)] mb-2">
                Maximum Members
              </label>
              <input
                id="max-members"
                type="number"
                value={settings.maxMembers || ''}
                onChange={(e) => updateSetting('maxMembers', parseInt(e.target.value) || 0)}
                placeholder="Unlimited"
                min="0"
                className={`w-full px-3 py-3 rounded-lg bg-white/5 border transition-colors text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  errors.maxMembers ? 'border-red-500/50' : 'border-border/20'
                }`}
              />
              {errors.maxMembers && <p className="mt-1 text-sm text-red-400">{errors.maxMembers}</p>}
              <p className="mt-1 text-xs text-[rgba(220,235,255,0.6)]">
                Leave empty or set to 0 for unlimited members
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border/20 bg-[color:var(--nav-bg)]/50 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-[rgba(220,235,255,0.8)] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !settings.name.trim()}
            className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              'Create Channel'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
