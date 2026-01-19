"use client";

import { useState, useMemo } from 'react';
import { ParticipantState } from './useVideoRoom';
import VideoTile from './VideoTile';

type ViewMode = 'grid' | 'spotlight' | 'speaker';

interface VideoGridProps {
  participants: ParticipantState[];
  localParticipant: ParticipantState | null;
  screenShareTrack: any | null;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  className?: string;
}

export default function VideoGrid({
  participants,
  localParticipant,
  screenShareTrack,
  viewMode = 'grid',
  onViewModeChange,
  className = '',
}: VideoGridProps) {
  const [spotlightedId, setSpotlightedId] = useState<string | null>(null);

  // Combine local and remote participants
  const allParticipants = useMemo(() => {
    const all: ParticipantState[] = [];
    if (localParticipant) {
      all.push(localParticipant);
    }
    all.push(...participants);
    return all;
  }, [participants, localParticipant]);

  // Determine grid layout based on participant count
  const gridLayout = useMemo(() => {
    const count = allParticipants.length;
    
    if (count === 0) {
      return { cols: 1, rows: 1 };
    } else if (count === 1) {
      return { cols: 1, rows: 1 };
    } else if (count === 2) {
      return { cols: 2, rows: 1 };
    } else if (count <= 4) {
      return { cols: 2, rows: 2 };
    } else if (count <= 9) {
      return { cols: 3, rows: 3 };
    } else {
      return { cols: 4, rows: Math.ceil(count / 4) };
    }
  }, [allParticipants.length]);

  const handleSpotlight = (participantId: string) => {
    if (spotlightedId === participantId) {
      setSpotlightedId(null);
    } else {
      setSpotlightedId(participantId);
    }
  };

  // Spotlight mode: show one participant large, others small
  if (viewMode === 'spotlight' && spotlightedId) {
    const spotlighted = allParticipants.find(
      p => p.participant.identity === spotlightedId
    );
    const others = allParticipants.filter(
      p => p.participant.identity !== spotlightedId
    );

    return (
      <div className={`flex gap-2 h-full ${className}`}>
        {/* Main spotlight view */}
        <div className="flex-1">
          {spotlighted && (
            <VideoTile
              participantState={spotlighted}
              isLocal={spotlighted.participant.identity === localParticipant?.participant.identity}
              isSpotlighted={true}
              onSpotlight={() => handleSpotlight(spotlighted.participant.identity)}
              className="h-full"
            />
          )}
        </div>

        {/* Sidebar with other participants */}
        {others.length > 0 && (
          <div className="w-48 flex flex-col gap-2 overflow-y-auto">
            {others.map((p) => (
              <VideoTile
                key={p.participant.identity}
                participantState={p}
                isLocal={p.participant.identity === localParticipant?.participant.identity}
                onSpotlight={() => handleSpotlight(p.participant.identity)}
                className="aspect-video"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid mode: show all participants in a grid
  return (
    <div
      className={`grid gap-2 h-full ${className}`}
      style={{
        gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`,
      }}
    >
      {allParticipants.map((participantState) => {
        const isLocal = participantState.participant.identity === localParticipant?.participant.identity;
        const isSpotlighted = spotlightedId === participantState.participant.identity;
        
        return (
          <VideoTile
            key={participantState.participant.identity}
            participantState={participantState}
            isLocal={isLocal}
            isSpotlighted={isSpotlighted}
            onSpotlight={() => handleSpotlight(participantState.participant.identity)}
            className="w-full h-full"
          />
        );
      })}

      {/* Empty slots for grid layout */}
      {Array.from({ length: gridLayout.cols * gridLayout.rows - allParticipants.length }).map((_, i) => (
        <div key={`empty-${i}`} className="bg-black/20 rounded-lg" />
      ))}
    </div>
  );
}
