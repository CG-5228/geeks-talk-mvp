"use client";
import { MessageSquare, Users, TrendingUp, Star } from 'lucide-react';

const stats = [
  { icon: MessageSquare, value: "10K+", label: "Messages Sent" },
  { icon: Users, value: "500+", label: "Active Members" },
  { icon: TrendingUp, value: "50+", label: "Study Rooms" },
  { icon: Star, value: "4.9", label: "Community Rating" }
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Computer Science Student",
    avatar: "SC",
    content: "Geeks Talk helped me understand complex algorithms through real-time discussions. The community is incredibly supportive!",
    rating: 5
  },
  {
    name: "Marcus Johnson",
    role: "Software Developer",
    avatar: "MJ", 
    content: "I've found amazing study partners and even landed a job referral through the connections I made here.",
    rating: 5
  },
  {
    name: "Alex Rivera",
    role: "Data Science Student",
    avatar: "AR",
    content: "The voice rooms are perfect for group projects. We can collaborate in real-time and get instant feedback.",
    rating: 5
  }
];

export default function SocialProof() {
  return (
    <section className="py-20 bg-gradient-to-b from-white/5 to-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4 group-hover:bg-primary/30 transition-colors">
                <stat.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-white/70">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Loved by students and developers
          </h2>
          <p className="text-xl text-white/70">
            Join thousands of learners who are already growing together
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all duration-300"
            >
              {/* Rating stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Testimonial content */}
              <p className="text-white/80 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-white/60">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* University logos placeholder */}
        <div className="mt-20 text-center">
          <p className="text-white/60 mb-8">Trusted by students from</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
            <div className="px-6 py-3 rounded-lg bg-white/10 text-white/70 font-semibold">
              Stanford
            </div>
            <div className="px-6 py-3 rounded-lg bg-white/10 text-white/70 font-semibold">
              MIT
            </div>
            <div className="px-6 py-3 rounded-lg bg-white/10 text-white/70 font-semibold">
              Berkeley
            </div>
            <div className="px-6 py-3 rounded-lg bg-white/10 text-white/70 font-semibold">
              Carnegie Mellon
            </div>
            <div className="px-6 py-3 rounded-lg bg-white/10 text-white/70 font-semibold">
              And many more...
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
