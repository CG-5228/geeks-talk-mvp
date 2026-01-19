"use client";

import { X } from 'lucide-react';
import { VideoQuality } from './useVideoRoom';

interface VideoSettingsProps {
  videoQuality: VideoQuality;
  onQualityChange: (quality: VideoQuality) => void;
  onClose: () => void;
}

export default function VideoSettings({
  videoQuality,
  onQualityChange,
  onClose,
}: VideoSettingsProps) {
  const qualityOptions: { value: VideoQuality; label: string; description: string }[] = [
    { value: 'hd', label: 'HD (720p)', description: 'Best quality, higher bandwidth' },
    { value: 'sd', label: 'SD (480p)', description: 'Balanced quality and bandwidth' },
    { value: 'low', label: 'Low (360p)', description: 'Lower quality, saves bandwidth' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#1a1b23] border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Video Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-3">
              Video Quality
            </label>
            <div className="space-y-2">
              {qualityOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    videoQuality === option.value
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="quality"
                    value={option.value}
                    checked={videoQuality === option.value}
                    onChange={() => onQualityChange(option.value)}
                    className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">{option.label}</div>
                    <div className="text-xs text-white/70">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-white/60">
              Changes will apply immediately. Lower quality settings use less bandwidth and may improve performance on slower connections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
