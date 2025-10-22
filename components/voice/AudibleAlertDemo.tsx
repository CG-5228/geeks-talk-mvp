"use client";
import { useState, useEffect } from 'react';
import AudibleAlertIcon, { DynamicAudibleAlertIcon, SimpleAudibleAlertIcon } from './AudibleAlertIcon';

export default function AudibleAlertDemo() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (demoMode) {
      const interval = setInterval(() => {
        const shouldSpeak = Math.random() > 0.3; // 70% chance of speaking
        const newVolume = shouldSpeak ? Math.random() : 0;
        
        setIsSpeaking(shouldSpeak);
        setVolume(newVolume);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [demoMode]);

  return (
    <div className="p-6 bg-card/95 backdrop-blur-xl rounded-xl border border-border/20">
      <h3 className="text-lg font-semibold text-foreground mb-4">Audible Alert Icon Demo</h3>
      
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              demoMode 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {demoMode ? 'Stop Demo' : 'Start Demo'}
          </button>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-foreground">Volume:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground w-8">
              {Math.round(volume * 100)}%
            </span>
          </div>
          
          <button
            onClick={() => setIsSpeaking(!isSpeaking)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              isSpeaking 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-500 text-white'
            }`}
          >
            {isSpeaking ? 'Speaking' : 'Silent'}
          </button>
        </div>

        {/* Demo Examples */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Standard Version */}
            <div className="p-4 bg-background/50 rounded-lg border border-border/10">
              <h4 className="text-sm font-medium text-foreground mb-2">Standard Version</h4>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">User Name</span>
                <AudibleAlertIcon
                  isSpeaking={isSpeaking}
                  volume={volume}
                  userId="demo-user"
                />
              </div>
            </div>

            {/* Dynamic Version */}
            <div className="p-4 bg-background/50 rounded-lg border border-border/10">
              <h4 className="text-sm font-medium text-foreground mb-2">Dynamic Version</h4>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">User Name</span>
                <DynamicAudibleAlertIcon
                  isSpeaking={isSpeaking}
                  volume={volume}
                  userId="demo-user"
                />
              </div>
            </div>

            {/* Simple Version */}
            <div className="p-4 bg-background/50 rounded-lg border border-border/10">
              <h4 className="text-sm font-medium text-foreground mb-2">Simple Version</h4>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">User Name</span>
                <SimpleAudibleAlertIcon
                  isSpeaking={isSpeaking}
                  volume={volume}
                  userId="demo-user"
                />
              </div>
            </div>
          </div>

          {/* Volume Level Examples */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Volume Level Examples:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { level: 'Low', volume: 0.2 },
                { level: 'Medium', volume: 0.5 },
                { level: 'High', volume: 0.8 },
                { level: 'Maximum', volume: 1.0 },
              ].map(({ level, volume: vol }) => (
                <div key={level} className="flex items-center gap-2 p-2 bg-background/30 rounded">
                  <span className="text-xs text-muted-foreground w-16">{level}</span>
                  <AudibleAlertIcon
                    isSpeaking={true}
                    volume={vol}
                    userId={`demo-${level}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Silent State */}
          <div className="flex items-center gap-2 p-2 bg-background/30 rounded">
            <span className="text-xs text-muted-foreground w-16">Silent</span>
            <AudibleAlertIcon
              isSpeaking={false}
              volume={0}
              userId="demo-silent"
            />
            <span className="text-xs text-muted-foreground ml-2">(No icon shown)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
