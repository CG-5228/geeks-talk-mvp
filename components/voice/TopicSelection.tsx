"use client";

import { useState } from 'react';
import { X, Plus, Users } from 'lucide-react';

interface TopicSelectionProps {
  onStartMatching: (topics: string[]) => void;
}

const PREDEFINED_TOPICS = [
  'General',
  'Cybersecurity', 
  'CS',
  'Math'
];

export default function TopicSelection({ onStartMatching }: TopicSelectionProps) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [matchAnyone, setMatchAnyone] = useState(false);

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const handleCustomTagAdd = () => {
    const trimmed = customTag.trim();
    if (trimmed && !selectedTopics.includes(trimmed)) {
      setSelectedTopics(prev => [...prev, trimmed]);
      setCustomTag('');
    }
  };

  const handleCustomTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomTagAdd();
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setSelectedTopics(prev => prev.filter(t => t !== topic));
  };

  const handleStartMatching = () => {
    const topics = matchAnyone ? [] : selectedTopics;
    onStartMatching(topics);
  };

  const canStart = matchAnyone || selectedTopics.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Select Your Interests</h2>
        <p className="text-muted-foreground">
          Choose topics you'd like to discuss. We'll match you with someone who shares similar interests.
        </p>
      </div>

      <div className="space-y-6">
        {/* Predefined Topics */}
        <div>
          <h3 className="text-lg font-medium text-foreground mb-3">Popular Topics</h3>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => handleTopicToggle(topic)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedTopics.includes(topic)
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-white/10 text-foreground hover:bg-white/20 border border-white/20'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Tags */}
        <div>
          <h3 className="text-lg font-medium text-foreground mb-3">Custom Topics</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyPress={handleCustomTagKeyPress}
              placeholder="Enter a custom topic..."
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30"
            />
            <button
              onClick={handleCustomTagAdd}
              disabled={!customTag.trim()}
              className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected Topics Display */}
        {selectedTopics.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">Selected Topics</h3>
            <div className="flex flex-wrap gap-2">
              {selectedTopics.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center gap-2 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                >
                  <span>{topic}</span>
                  <button
                    onClick={() => handleRemoveTopic(topic)}
                    className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match Anyone Option */}
        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
          <input
            type="checkbox"
            id="matchAnyone"
            checked={matchAnyone}
            onChange={(e) => setMatchAnyone(e.target.checked)}
            className="w-4 h-4 text-primary bg-white/10 border-white/20 rounded focus:ring-primary/50"
          />
          <label htmlFor="matchAnyone" className="text-foreground cursor-pointer">
            <span className="font-medium">Match with anyone</span>
            <p className="text-sm text-muted-foreground">
              Skip topic matching and get paired with any available user
            </p>
          </label>
        </div>

        {/* Start Matching Button */}
        <div className="pt-4">
          <button
            onClick={handleStartMatching}
            disabled={!canStart}
            className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {matchAnyone ? 'Start Matching (Any Topic)' : `Start Matching (${selectedTopics.length} topics)`}
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          We'll prioritize matching you with users who share your selected topics. 
          If no exact matches are found, we'll pair you with the best available option.
        </p>
      </div>
    </div>
  );
}
