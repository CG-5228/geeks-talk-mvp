'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, AlertCircle, Info, AlertTriangle, CheckCircle, XCircle, Radio, Clock, Trash2, Power, PowerOff } from 'lucide-react';

interface Announcement {
  id: string;
  scope: 'MAIN' | 'LIVE';
  message: string;
  variant: string;
  behavior: 'TIMED' | 'PERSISTENT';
  durationMs: number | null;
  isActive: boolean;
  dismissKey: string;
  updatedAt: string;
}

const VARIANTS = [
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-400' },
  { value: 'info', label: 'Info', icon: Info, color: 'text-sky-400' },
  { value: 'danger', label: 'Danger', icon: XCircle, color: 'text-red-400' },
  { value: 'success', label: 'Success', icon: CheckCircle, color: 'text-emerald-400' },
];

export default function SiteBannerPage() {
  const [mainAnnouncement, setMainAnnouncement] = useState<Announcement | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState({ main: false, live: false });
  const sseRefs = useRef<{ main: EventSource | null; live: EventSource | null }>({ main: null, live: null });

  useEffect(() => {
    fetchAnnouncements();
    setupSSEConnections();

    return () => {
      // Cleanup SSE connections
      if (sseRefs.current.main) {
        sseRefs.current.main.close();
      }
      if (sseRefs.current.live) {
        sseRefs.current.live.close();
      }
    };
  }, []);

  const setupSSEConnections = () => {
    // Main scope SSE - only for connection status, not for data updates
    // Admin panel should use admin API which returns all banners regardless of active status
    const mainSSE = new EventSource('/api/announcements/realtime?scope=main');
    mainSSE.onopen = () => {
      setSseConnected(prev => ({ ...prev, main: true }));
    };
    mainSSE.onmessage = (event) => {
      // Don't update state from SSE - admin panel needs to see inactive banners too
      // Just use SSE for connection status
      try {
        const data = JSON.parse(event.data);
        // When announcement changes, refetch from admin API to get full data (including inactive)
        if (data.announcement || !data.announcement) {
          // Refetch to get the actual state (including inactive banners)
          fetchAnnouncements();
        }
      } catch (error) {
        console.error('Error parsing SSE data for main:', error);
      }
    };
    mainSSE.onerror = () => {
      setSseConnected(prev => ({ ...prev, main: false }));
      // Reconnect after delay
      setTimeout(() => {
        if (sseRefs.current.main) {
          sseRefs.current.main.close();
        }
        setupSSEConnections();
      }, 3000);
    };
    sseRefs.current.main = mainSSE;

    // Live scope SSE - only for connection status, not for data updates
    const liveSSE = new EventSource('/api/announcements/realtime?scope=live');
    liveSSE.onopen = () => {
      setSseConnected(prev => ({ ...prev, live: true }));
    };
    liveSSE.onmessage = (event) => {
      // Don't update state from SSE - admin panel needs to see inactive banners too
      // Just use SSE for connection status
      try {
        const data = JSON.parse(event.data);
        // When announcement changes, refetch from admin API to get full data (including inactive)
        if (data.announcement || !data.announcement) {
          // Refetch to get the actual state (including inactive banners)
          fetchAnnouncements();
        }
      } catch (error) {
        console.error('Error parsing SSE data for live:', error);
      }
    };
    liveSSE.onerror = () => {
      setSseConnected(prev => ({ ...prev, live: false }));
      // Reconnect after delay
      setTimeout(() => {
        if (sseRefs.current.live) {
          sseRefs.current.live.close();
        }
        setupSSEConnections();
      }, 3000);
    };
    sseRefs.current.live = liveSSE;
  };

  const fetchAnnouncements = async () => {
    try {
      const [mainRes, liveRes] = await Promise.all([
        fetch('/api/admin/announcements?scope=main'),
        fetch('/api/admin/announcements?scope=live'),
      ]);

      const mainData = await mainRes.json();
      const liveData = await liveRes.json();

      setMainAnnouncement(mainData.announcement || null);
      setLiveAnnouncement(liveData.announcement || null);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      setSaveError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const saveAnnouncement = async (scope: 'MAIN' | 'LIVE', data: Partial<Announcement>) => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: scope.toLowerCase(),
          ...data,
        }),
      });

      if (!res.ok) {
        let errorMessage = 'Failed to save announcement';
        try {
          const error = await res.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      
      // Refetch to ensure we have the latest state (including inactive banners)
      await fetchAnnouncements();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save announcement');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const resetDismissals = async (scope: 'MAIN' | 'LIVE') => {
    const announcement = scope === 'MAIN' ? mainAnnouncement : liveAnnouncement;
    if (!announcement) return;

    await saveAnnouncement(scope, {
      ...announcement,
      resetDismissals: true,
    });
  };

  const deleteAnnouncement = async (scope: 'MAIN' | 'LIVE') => {
    if (!confirm(`Are you sure you want to delete the ${scope === 'MAIN' ? 'main site' : 'live subdomain'} banner? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/announcements?scope=${scope.toLowerCase()}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete announcement');
      }

      // Refetch to update state (will be null if deleted)
      await fetchAnnouncements();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to delete announcement');
      setTimeout(() => setSaveError(null), 5000);
    }
  };

  const toggleActive = async (scope: 'MAIN' | 'LIVE') => {
    const announcement = scope === 'MAIN' ? mainAnnouncement : liveAnnouncement;
    if (!announcement) return;

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: scope.toLowerCase(),
          isActive: !announcement.isActive,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to toggle announcement status');
      }

      const result = await res.json();
      
      // Refetch to ensure we have the latest state (including inactive banners)
      await fetchAnnouncements();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to toggle announcement status');
      setTimeout(() => setSaveError(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-96 bg-white/10 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Site Banner Management</h2>
        <p className="text-white/70">Configure notification banners for the main site and live subdomain.</p>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-100">
          Announcement saved successfully!
        </div>
      )}

      {saveError && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-100">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Site Banner */}
        <AnnouncementEditor
          title="Main Site Banner"
          description="Shown on the main website (non-live subdomain)"
          announcement={mainAnnouncement}
          onSave={(data) => saveAnnouncement('MAIN', data)}
          onResetDismissals={() => resetDismissals('MAIN')}
          saving={saving}
        />

        {/* Live Subdomain Banner */}
        <AnnouncementEditor
          title="Live Subdomain Banner"
          description="Shown on live.* subdomain pages"
          announcement={liveAnnouncement}
          onSave={(data) => saveAnnouncement('LIVE', data)}
          onResetDismissals={() => resetDismissals('LIVE')}
          saving={saving}
        />
      </div>

      {/* Active Banner Status Section */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Active Banner Status</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sseConnected.main ? 'bg-emerald-400' : 'bg-gray-500'}`}></div>
              <span className="text-white/70">Main: {sseConnected.main ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sseConnected.live ? 'bg-emerald-400' : 'bg-gray-500'}`}></div>
              <span className="text-white/70">Live: {sseConnected.live ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BannerStatusCard
            title="Main Site Banner"
            announcement={mainAnnouncement}
            onDelete={() => deleteAnnouncement('MAIN')}
            onToggleActive={() => toggleActive('MAIN')}
          />
          <BannerStatusCard
            title="Live Subdomain Banner"
            announcement={liveAnnouncement}
            onDelete={() => deleteAnnouncement('LIVE')}
            onToggleActive={() => toggleActive('LIVE')}
          />
        </div>
      </div>
    </div>
  );
}

interface AnnouncementEditorProps {
  title: string;
  description: string;
  announcement: Announcement | null;
  onSave: (data: Partial<Announcement>) => void;
  onResetDismissals: () => void;
  saving: boolean;
}

function AnnouncementEditor({
  title,
  description,
  announcement,
  onSave,
  onResetDismissals,
  saving,
}: AnnouncementEditorProps) {
  const [message, setMessage] = useState(announcement?.message || '');
  const [variant, setVariant] = useState(announcement?.variant || 'warning');
  const [behavior, setBehavior] = useState<'TIMED' | 'PERSISTENT'>(
    announcement?.behavior || 'PERSISTENT'
  );
  const [durationSeconds, setDurationSeconds] = useState(
    announcement?.durationMs ? Math.floor(announcement.durationMs / 1000) : 5
  );

  useEffect(() => {
    if (announcement) {
      setMessage(announcement.message);
      setVariant(announcement.variant);
      setBehavior(announcement.behavior);
      setDurationSeconds(announcement.durationMs ? Math.floor(announcement.durationMs / 1000) : 5);
    }
  }, [announcement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      message,
      variant,
      behavior,
      durationMs: behavior === 'TIMED' ? durationSeconds * 1000 : null,
      isActive: true, // Always set to active when saving
    });
  };

  return (
    <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/70 mb-6">{description}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter notification message..."
            rows={4}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            Color / Variant
          </label>
          <div className="grid grid-cols-2 gap-2">
            {VARIANTS.map((v) => {
              const Icon = v.icon;
              const isSelected = variant === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVariant(v.value)}
                  className={`p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-[#00d9ff] bg-[#00d9ff]/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${v.color}`} />
                    <span className="text-white text-sm">{v.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            Display Behavior
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer">
              <input
                type="radio"
                value="PERSISTENT"
                checked={behavior === 'PERSISTENT'}
                onChange={() => setBehavior('PERSISTENT')}
                className="w-4 h-4 text-[#00d9ff] focus:ring-[#00d9ff]"
              />
              <div>
                <div className="text-white font-medium">Persistent</div>
                <div className="text-xs text-white/70">
                  Stays visible until user closes it
                </div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer">
              <input
                type="radio"
                value="TIMED"
                checked={behavior === 'TIMED'}
                onChange={() => setBehavior('TIMED')}
                className="w-4 h-4 text-[#00d9ff] focus:ring-[#00d9ff]"
              />
              <div className="flex-1">
                <div className="text-white font-medium">Timed</div>
                <div className="text-xs text-white/70">
                  Auto-hides after specified duration
                </div>
              </div>
            </label>
          </div>
        </div>

        {behavior === 'TIMED' && (
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Duration (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 5)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50"
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-white/20">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>

          {announcement && (
            <button
              type="button"
              onClick={onResetDismissals}
              className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              Reset Dismissals
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

interface BannerStatusCardProps {
  title: string;
  announcement: Announcement | null;
  onDelete: () => void;
  onToggleActive: () => void;
}

function BannerStatusCard({ title, announcement, onDelete, onToggleActive }: BannerStatusCardProps) {
  if (!announcement) {
    return (
      <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">{title}</h4>
        <div className="text-white/50 text-sm">No active banner</div>
      </div>
    );
  }

  const variantInfo = VARIANTS.find(v => v.value === announcement.variant) || VARIANTS[0];
  const VariantIcon = variantInfo.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateMessage = (msg: string, maxLength: number = 100) => {
    if (msg.length <= maxLength) return msg;
    return msg.substring(0, maxLength) + '...';
  };

  // For TIMED banners, consider them "inactive" in the status view once the duration has passed,
  // to match what users see (banner disappears on client when timer ends).
  const isTimed = announcement.behavior === 'TIMED';
  const durationMs = announcement.durationMs ?? 0;
  const updatedAtMs = new Date(announcement.updatedAt).getTime();
  const nowMs = Date.now();
  const hasExpired = isTimed && durationMs > 0 && nowMs - updatedAtMs > durationMs;
  const isVisiblyActive = announcement.isActive && !hasExpired;

  return (
    <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-white mb-4">{title}</h4>
      
      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isVisiblyActive
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
          }`}>
            {isVisiblyActive ? 'Active' : isTimed && hasExpired ? 'Completed (Timed)' : 'Inactive'}
          </span>
        </div>

        {/* Message Preview */}
        <div>
          <div className="text-xs text-white/60 mb-1">Message</div>
          <div className="text-white/90 text-sm">{truncateMessage(announcement.message)}</div>
        </div>

        {/* Variant/Color */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-white/60">Variant:</div>
          <div className="flex items-center gap-2">
            <VariantIcon className={`h-4 w-4 ${variantInfo.color}`} />
            <span className="text-white/90 text-sm capitalize">{variantInfo.label}</span>
          </div>
        </div>

        {/* Behavior */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-white/60">Behavior:</div>
          <div className="flex items-center gap-2">
            {announcement.behavior === 'TIMED' ? (
              <>
                <Clock className="h-4 w-4 text-white/70" />
                <span className="text-white/90 text-sm">
                  {hasExpired
                    ? `Timed · Completed (${announcement.durationMs ? Math.floor(announcement.durationMs / 1000) : 0}s)`
                    : `Timed (${announcement.durationMs ? Math.floor(announcement.durationMs / 1000) : 0}s)`}
                </span>
              </>
            ) : (
              <>
                <Radio className="h-4 w-4 text-white/70" />
                <span className="text-white/90 text-sm">Persistent</span>
              </>
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="pt-3 border-t border-white/10">
          <div className="text-xs text-white/60">Last Updated</div>
          <div className="text-white/70 text-sm mt-1">{formatDate(announcement.updatedAt)}</div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/10 flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              announcement.isActive
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            {announcement.isActive ? (
              <>
                <PowerOff className="h-4 w-4" />
                <span>Deactivate</span>
              </>
            ) : (
              <>
                <Power className="h-4 w-4" />
                <span>Activate</span>
              </>
            )}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
