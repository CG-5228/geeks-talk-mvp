"use client";
import Link from 'next/link';
import { ArrowRight, Check, Users, MessageSquare, Mic } from 'lucide-react';

const benefits = [
  "Join 500+ active members",
  "Access to all subject channels", 
  "Real-time chat and collaboration",
  "Voice rooms (unlock with participation)",
  "Direct messaging with peers",
  "No credit card required"
];

export default function FinalCTA() {
  return (
    <section className="py-20 bg-gradient-to-b from-white/5 to-primary/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main CTA */}
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Join the Community?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Start your journey today and connect with fellow learners, 
            developers, and tech enthusiasts from around the world.
          </p>
          
          <Link
            href="/live"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-primary hover:bg-primary/90 text-white font-bold text-xl rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-primary/25 hover:scale-105 mb-8"
          >
            Start Chatting Free
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-white/60 text-sm">
            Free forever. No credit card required.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-white/90 text-sm">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <Users className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-2">Active Community</h3>
            <p className="text-white/70 text-sm">Join hundreds of active learners and developers</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <MessageSquare className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-2">Real-time Chat</h3>
            <p className="text-white/70 text-sm">Get instant help and share knowledge</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
            <Mic className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-2">Voice Collaboration</h3>
            <p className="text-white/70 text-sm">Unlock voice rooms for group study</p>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-wrap justify-center items-center gap-8 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>127 geeks online now</span>
            </div>
            <div>•</div>
            <div>No spam, community-moderated</div>
            <div>•</div>
            <div>Free forever</div>
          </div>
        </div>
      </div>
    </section>
  );
}
