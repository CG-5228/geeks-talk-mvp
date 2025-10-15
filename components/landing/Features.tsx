"use client";
import { MessageSquare, Users, Mic, Code, Calculator, Brain, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: "Real-time Chat Channels",
    description: "Join subject-specific channels for CS, Math, AI, and more. Get instant help and share knowledge with your peers.",
    benefits: ["Instant responses", "Subject-focused", "Always available"]
  },
  {
    icon: Mic,
    title: "Voice Rooms",
    description: "Unlock voice collaboration after participating in text channels. Perfect for group study sessions and deep discussions.",
    benefits: ["Group study sessions", "Real-time discussion", "Unlock with participation"]
  },
  {
    icon: Users,
    title: "Direct Messaging",
    description: "Connect directly with other members for one-on-one help, project collaboration, and building lasting connections.",
    benefits: ["One-on-one help", "Project collaboration", "Build connections"]
  }
];

const subjects = [
  { icon: Code, name: "Computer Science", color: "text-blue-400" },
  { icon: Calculator, name: "Mathematics", color: "text-green-400" },
  { icon: Brain, name: "Artificial Intelligence", color: "text-purple-400" },
  { icon: Shield, name: "Cybersecurity", color: "text-red-400" },
  { icon: Zap, name: "Web Development", color: "text-yellow-400" }
];

export default function Features() {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-transparent to-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need to learn and grow
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            From real-time chat to voice collaboration, Geeks Talk provides all the tools 
            you need to succeed in your tech journey.
          </p>
        </div>

        {/* Main features grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              </div>
              
              <p className="text-white/70 mb-6 leading-relaxed">
                {feature.description}
              </p>
              
              <ul className="space-y-2">
                {feature.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Subject channels */}
        <div className="text-center">
          <h3 className="text-2xl font-semibold text-white mb-8">
            Join channels by subject
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {subjects.map((subject, index) => (
              <div
                key={index}
                className="group p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer"
              >
                <subject.icon className={`w-8 h-8 mx-auto mb-2 ${subject.color} group-hover:scale-110 transition-transform`} />
                <div className="text-sm font-medium text-white group-hover:text-white/90">
                  {subject.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
