import React from 'react';
import { Sparkles, ArrowRight, ChevronDown } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex flex-col items-center justify-center pt-24 md:pt-20 pb-12 overflow-hidden">
      {/* Ambient Background Glows — ripple grid is global in GlobalLayout */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[80rem] h-[50rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-[1]" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full blur-[100px] pointer-events-none z-[1]" style={{ background: 'rgba(0,212,255,0.04)' }} />
      
      {/* Badge */}
      <div
        className="relative glass-card bg-white/50 border-slate-200/60 rounded-full mt-4 md:mt-8 px-4 py-2 flex items-center gap-2 z-20 opacity-100 shadow-xl shadow-slate-200/10"
        style={{ animation: 'animationIn 0.8s ease-out 0.2s forwards', opacity: 0 }}
      >
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A6741] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A6741]"></span>
        </span>
        <span className="text-[10px] md:text-xs font-black text-[#1a1a1a] uppercase tracking-[0.2em]">Virtual Try-On API · v3.0</span>
      </div>

      <h1
        className="mt-6 md:mt-10 text-center font-sans font-[900] tracking-tighter leading-[0.85] z-20 relative px-6 md:px-4"
        style={{
          fontSize: 'clamp(3.5rem, 15vw, 9rem)',
          animation: 'animationIn 0.8s ease-out 0.3s forwards',
          opacity: 0,
        }}
      >
        <span className="block text-gradient-primary pb-2">See It On You.</span>
        <span className="mt-4 block w-full max-w-[min(100%,48rem)] mx-auto text-slate-500 opacity-90" style={{ fontSize: 'clamp(2.5rem, 10vw, 6.5rem)' }}>
          Before You Buy.
        </span>
      </h1>

      {/* Sub */}
      <p
        className="mt-8 md:mt-10 text-base md:text-xl text-slate-500 text-center max-w-2xl leading-relaxed font-medium px-8 md:px-6 z-20 relative"
        style={{ animation: 'animationIn 0.8s ease-out 0.4s forwards', opacity: 0 }}
      >
        VEXA embeds AI-powered 3D virtual try-on directly into your fashion platform.
        One Software Development Kit. Zero friction. <span className="text-[#4A6741]">Measurably fewer returns.</span>
      </p>

      {/* CTAs */}
      <div
        className="flex flex-col sm:flex-row mt-12 md:mt-14 gap-4 items-center z-20 relative w-full px-8 md:px-0 sm:w-auto"
        style={{ animation: 'animationIn 0.8s ease-out 0.5s forwards', opacity: 0 }}
      >
        <a href="/#booking" className="group w-full sm:w-auto relative flex items-center justify-center gap-4 bg-[#4A6741] rounded-[2rem] p-2 pr-10 md:pr-12 hover:bg-[#3d5636] transition-all duration-500 shadow-2xl shadow-[#4A6741]/30 hover:scale-105 active:scale-95">
          <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="relative z-10 text-base font-black text-white uppercase tracking-widest text-[11px]">Book a Demo</span>
        </a>

        <a href="/studio" className="w-full sm:w-auto flex items-center justify-center gap-3 border border-slate-200 hover:border-[#4A6741]/30 bg-white/80 backdrop-blur-md rounded-[2rem] px-8 py-5 text-[11px] font-black text-[#1a1a1a] uppercase tracking-widest transition-all duration-500 group shadow-xl shadow-slate-200/20 hover:bg-white hover:scale-105 active:scale-95">
          <span>Start Integration</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      {/* Floating Cards (Hidden on small mobile, shown on tablets and up) */}
      {/* Card 1: Conversion Rate */}
      <div
        className="hidden sm:block glass-card rounded-[2rem] p-6 absolute top-[20%] left-[4%] md:left-[8%] w-56 md:w-64 animate-float-1 border-slate-200/60 bg-white/60 shadow-2xl shadow-slate-200/10"
        style={{ zIndex: 20 }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conversion Rate</span>
          <div className="w-2 h-2 rounded-full bg-[#4A6741] animate-pulse" />
        </div>
        <div className="text-4xl font-black text-[#4A6741] mb-1 tracking-tighter">+312%</div>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">vs. static images</div>
        <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#4A6741]" style={{ width: '78%' }} />
        </div>
      </div>

      {/* Card 3: Return Rate */}
      <div
        className="hidden sm:block glass-card rounded-[2rem] p-6 absolute bottom-[15%] left-[6%] md:left-[10%] w-64 md:w-72 animate-float-3 border-slate-200/60 bg-white/60 shadow-2xl shadow-slate-200/10"
        style={{ zIndex: 20 }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Return Rate</span>
          <span className="text-[10px] font-black text-[#4A6741] bg-[#4A6741]/10 px-3 py-1 rounded-full uppercase tracking-widest">↓ 40%</span>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">
              <span>Standard</span>
              <span>28%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full w-full overflow-hidden">
              <div className="h-full rounded-full bg-slate-300" style={{ width: '60%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-bold text-[#4A6741] mb-2 uppercase tracking-wide">
              <span>With VEXA</span>
              <span>17%</span>
            </div>
            <div className="h-2 bg-[#4A6741]/20 rounded-full w-full overflow-hidden">
              <div className="h-full rounded-full bg-[#4A6741]" style={{ width: '35%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400 z-20 animate-bounce">
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Scroll</span>
        <ChevronDown className="w-5 h-5 text-slate-400" />
      </div>
    </section>
  );
}