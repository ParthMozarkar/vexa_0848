'use client';
import React from 'react';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "We integrated VEXA in a single afternoon. Return rates dropped from 26% to 15% within the first month. The ROI was immediate.",
    name: "Priya Sharma",
    role: "CTO, Runway Republic",
    company: "D2C Fashion, Mumbai",
    accent: '#4A6741'
  },
  {
    quote: "Our customers spend 4× longer on product pages since adding VEXA try-on. Conversion jumped 280% on items with the feature enabled.",
    name: "Marcus Webb",
    role: "VP E-commerce, LookBook",
    company: "Fashion Retail, New York",
    accent: '#8B7D3C'
  },
  {
    quote: "The API documentation is exceptional. My team had a working integration in 3 hours. The accuracy of the body mapping is genuinely impressive.",
    name: "Yuki Tanaka",
    role: "Lead Engineer, StyleGrid",
    company: "Fashion Tech, Tokyo",
    accent: '#6B8C5E'
  },
  {
    quote: "VEXA's multi-brand support let us roll it out across all 12 of our portfolio brands from a single integration. Game-changing for our scale.",
    name: "Aisha Okonkwo",
    role: "Head of Product, Couture Group",
    company: "Fashion Conglomerate, Lagos",
    accent: '#A69060'
  }
];

export default function TestimonialsSection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-white/30">
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-16 md:mb-24 animate-on-scroll"
          style={{ animation: 'animationIn 0.8s ease-out 0.2s forwards', opacity: 0 }}
        >
          <div className="max-w-2xl">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#4A6741] mb-4 block">Social Proof</span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#1a1a1a]">
              Brands that{' '}
              <span className="text-gradient-primary">ship with VEXA.</span>
            </h2>
          </div>
          <p className="text-slate-500 max-w-sm text-base md:text-lg leading-relaxed font-medium">
            From D2C startups to enterprise fashion groups — teams at every scale trust VEXA.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative glass-card rounded-[2.5rem] p-8 md:p-12 flex flex-col group hover:border-[#4A6741]/30 transition-all duration-700 bg-white shadow-2xl shadow-slate-200/10"
              style={{
                animation: `animationIn 0.8s ease-out ${0.2 + i * 0.15}s forwards`,
                opacity: 0,
              }}
            >
              <div className="mb-8">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner"
                  style={{ background: `${t.accent}10`, color: t.accent }}
                >
                  <Quote className="w-5 h-5" />
                </div>
                <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              
              <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-black text-[#1a1a1a] text-base tracking-tight">{t.name}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.role}</div>
                </div>
                <div className="text-[10px] font-black text-[#4A6741] uppercase tracking-[0.2em] bg-[#4A6741]/10 px-4 py-2 rounded-full">
                  {t.company}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}