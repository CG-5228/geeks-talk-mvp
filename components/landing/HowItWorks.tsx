"use client";
import { Hash, MessageSquare, Mic, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: "01",
    icon: Hash,
    title: "Join a Channel",
    description: "Pick your subject - Computer Science, Math, AI, or any topic you're passionate about. Jump right into the conversation.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    number: "02", 
    icon: MessageSquare,
    title: "Ask & Answer",
    description: "Get help with your questions and help others with theirs. Build your reputation in the community through helpful contributions.",
    color: "from-green-500 to-emerald-500"
  },
  {
    number: "03",
    icon: Mic,
    title: "Level Up",
    description: "Unlock voice rooms and advanced features as you participate more. Join group study sessions and collaborate in real-time.",
    color: "from-purple-500 to-pink-500"
  }
];

export default function HowItWorks() {
  return (
    <section className="py-20 bg-gradient-to-b from-transparent to-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            How it works
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Getting started is simple. Join, participate, and unlock new possibilities 
            as you grow with the community.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary/30 to-primary/50 transform -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="text-center group">
                {/* Step number and icon */}
                <div className="relative mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${step.color} opacity-20 group-hover:opacity-30 transition-opacity`} />
                    <step.icon className="w-8 h-8 text-white relative z-10" />
                  </div>
                  
                  {/* Step number */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-4">
                  {step.title}
                </h3>
                
                <p className="text-white/70 leading-relaxed">
                  {step.description}
                </p>

                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center mt-8">
                    <ArrowRight className="w-6 h-6 text-white/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/20 border border-primary/30 text-primary font-semibold">
            <span>Ready to get started?</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
