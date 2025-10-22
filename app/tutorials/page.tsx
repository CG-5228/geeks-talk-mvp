"use client";
import { PlaySquare, Video, Clock, Users } from 'lucide-react';

export default function TutorialsPage() {
  const placeholderVideos = [
    { id: 1, title: "Getting Started with Geeks Talk", duration: "5:30", views: "1.2k" },
    { id: 2, title: "Voice Chat Features", duration: "8:15", views: "856" },
    { id: 3, title: "Text Chat Best Practices", duration: "6:45", views: "2.1k" },
    { id: 4, title: "Collaborative Canvas Guide", duration: "12:20", views: "1.5k" },
    { id: 5, title: "File Sharing & Management", duration: "7:10", views: "934" },
    { id: 6, title: "Group Management Tips", duration: "9:30", views: "1.8k" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ff006e]/20 border border-[#ff006e]/30 rounded-full mb-4">
            <PlaySquare className="w-8 h-8 text-[#ff006e]" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Tutorial Videos</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Learn how to make the most of Geeks Talk with our comprehensive video tutorials.
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-[#ff006e]/10 to-[#b537ff]/10 border border-[#ff006e]/20 rounded-xl p-8 mb-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#ff006e]/20 border border-[#ff006e]/30 rounded-full mb-4">
            <Clock className="w-6 h-6 text-[#ff006e]" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Coming Soon!</h2>
          <p className="text-white/70">
            We're working hard to bring you high-quality video tutorials. 
            Stay tuned for comprehensive guides on all Geeks Talk features.
          </p>
        </div>

        {/* Placeholder Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {placeholderVideos.map((video) => (
            <div
              key={video.id}
              className="bg-black/20 border border-white/10 rounded-xl p-6 hover:border-[#ff006e]/30 transition-all duration-200 group"
            >
              {/* Video Thumbnail Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-[#ff006e]/20 to-[#b537ff]/20 border border-[#ff006e]/20 rounded-lg mb-4 flex items-center justify-center group-hover:border-[#ff006e]/40 transition-colors">
                <div className="text-center">
                  <Video className="w-12 h-12 text-[#ff006e]/50 mx-auto mb-2" />
                  <p className="text-white/50 text-sm">Video Preview</p>
                </div>
              </div>

              {/* Video Info */}
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#ff006e] transition-colors">
                {video.title}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-white/60">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{video.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{video.views} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="bg-black/20 border border-white/10 rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-white mb-4">What to Expect</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#00d9ff] rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-white mb-1">Step-by-step Guides</h4>
                  <p className="text-white/70 text-sm">Detailed walkthroughs of every feature</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#b537ff] rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-white mb-1">Best Practices</h4>
                  <p className="text-white/70 text-sm">Tips and tricks from experienced users</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#ff006e] rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-white mb-1">Troubleshooting</h4>
                  <p className="text-white/70 text-sm">Solutions to common issues</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#00d9ff] rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-white mb-1">Advanced Features</h4>
                  <p className="text-white/70 text-sm">Unlock the full potential of Geeks Talk</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
