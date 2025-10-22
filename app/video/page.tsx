"use client";

import { useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, Users, Settings } from 'lucide-react';

export default function VideoChatPage() {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Video className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white">Video Chat</h1>
                <p className="text-sm text-white/70">Connect face-to-face with your community</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Users className="h-5 w-5" />
              </button>
              <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {!isInCall ? (
          /* Pre-call Interface */
          <div className="text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <Video className="h-16 w-16 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Video Chat</h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Start a video call with your friends and community members. 
                Share your screen, collaborate, and connect face-to-face.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Video className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">HD Video</h3>
                <p className="text-white/70">Crystal clear video quality for the best experience</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Users className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Group Calls</h3>
                <p className="text-white/70">Connect with multiple people in one call</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Settings className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Screen Share</h3>
                <p className="text-white/70">Share your screen for presentations and collaboration</p>
              </div>
            </div>

            {/* Call Controls */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isVideoOn 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                {isVideoOn ? 'Video On' : 'Video Off'}
              </button>
              
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isMicOn 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {isMicOn ? 'Mic On' : 'Mic Off'}
              </button>
            </div>

            {/* Start Call Button */}
            <button
              onClick={() => setIsInCall(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Start Video Call
            </button>

            {/* Coming Soon Notice */}
            <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-2xl mx-auto">
              <p className="text-yellow-400 font-medium">🚧 Coming Soon</p>
              <p className="text-white/70 text-sm mt-1">
                Video chat functionality is currently under development. 
                This is a placeholder page for the upcoming video calling feature.
              </p>
            </div>
          </div>
        ) : (
          /* In-Call Interface */
          <div className="h-[calc(100vh-200px)] bg-black rounded-xl overflow-hidden relative">
            {/* Video Grid Placeholder */}
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Video className="h-12 w-12 text-white/50" />
                </div>
                <p className="text-white/70">Video call interface will be implemented here</p>
              </div>
            </div>

            {/* Call Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md rounded-full px-6 py-3">
                <button
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-3 rounded-full transition-colors ${
                    isVideoOn 
                      ? 'bg-white/20 text-white hover:bg-white/30' 
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>
                
                <button
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-3 rounded-full transition-colors ${
                    isMicOn 
                      ? 'bg-white/20 text-white hover:bg-white/30' 
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>
                
                <button
                  onClick={() => setIsInCall(false)}
                  className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
