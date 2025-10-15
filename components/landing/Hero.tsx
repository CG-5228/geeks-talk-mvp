"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Users, MessageSquare } from 'lucide-react';

export default function Hero() {
  const [onlineCount, setOnlineCount] = useState(127);

  // Simulate live user count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-500/10 to-purple-500/20 animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent" />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Live user counter */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-white/90">
            {onlineCount} geeks online now
          </span>
        </div>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Learn Together.
          <br />
          <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Build Together.
          </span>
          <br />
          <span className="text-3xl sm:text-4xl lg:text-5xl text-white/90">
            Geeks Talk.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl sm:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
          Join the community where developers, students, and tech enthusiasts 
          collaborate, learn, and grow together in real-time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link
            href="/live"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold text-lg rounded-xl transition-all duration-300 shadow-lg hover:shadow-primary/25 hover:scale-105"
          >
            Start Chatting Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <button
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg rounded-xl border border-white/20 transition-all duration-300 backdrop-blur-md"
          >
            See How It Works
          </button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
            <MessageSquare className="w-8 h-8 text-primary" />
            <div className="text-left">
              <div className="font-semibold text-white">Real-time Chat</div>
              <div className="text-sm text-white/70">Instant collaboration</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
            <Users className="w-8 h-8 text-primary" />
            <div className="text-left">
              <div className="font-semibold text-white">Study Groups</div>
              <div className="text-sm text-white/70">Learn with peers</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
            <ArrowRight className="w-8 h-8 text-primary" />
            <div className="text-left">
              <div className="font-semibold text-white">Voice Rooms</div>
              <div className="text-sm text-white/70">Unlock with participation</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
