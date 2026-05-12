import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="relative glass-card rounded-[3rem] overflow-hidden opacity-100 animate-on-scroll bg-white shadow-2xl shadow-slate-200/20"
          style={{ animation: 'animationIn 0.8s ease-out 0.2s forwards', opacity: 0 }}
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full blur-[100px]" style={{ background: 'rgba(74,103,65,0.08)' }} />
          </div>

          {/* Ghost text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
            <span className="text-[12vw] font-black whitespace-nowrap tracking-tighter opacity-[0.03] uppercase">
              Start Building
            </span>
          </div>

          <div className="relative z-10 px-8 md:px-20 py-20 md:py-24 flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
            <div className="max-w-2xl">
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#4A6741] mb-6 block">
                Ready to integrate?
              </span>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">
                <span className="text-slate-400">Deploy virtual try-on</span>
                <span className="block text-[#1a1a1a]">in one afternoon.</span>
              </h2>
              <p className="text-slate-500 text-base md:text-lg leading-relaxed font-medium max-w-md mx-auto lg:mx-0">
                Three lines of code. Full 3D virtual try-on. Your customers see it on themselves — before checkout.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full sm:w-auto">
              <Link
                href="/#booking-section"
                className="group relative flex items-center justify-center gap-4 bg-[#4A6741] text-white rounded-full px-10 py-5 text-xs font-black uppercase tracking-widest shadow-2xl shadow-[#4A6741]/20 transition-all duration-500 hover:scale-105 active:scale-95"
              >
                <span>Book a Demo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/studio"
                className="flex items-center justify-center gap-3 border border-slate-200 hover:border-[#4A6741]/30 bg-white/80 backdrop-blur-md rounded-full px-10 py-5 text-xs font-black text-[#1a1a1a] uppercase tracking-widest transition-all duration-500 hover:bg-white hover:scale-105 active:scale-95 shadow-xl shadow-slate-200/10"
              >
                Start Integration
              </Link>
            </div>
          </div>

          {/* Bottom stats bar */}
          <div className="relative z-10 border-t border-slate-50 px-8 md:px-20 py-8 flex flex-wrap justify-center lg:justify-start gap-12 md:gap-16">
            {[
              { label: 'Setup time', val: '< 1 day' },
              { label: 'Uptime SLA', val: '99.9%' },
              { label: 'Brands integrated', val: '300+' },
              { label: 'Support', val: '24/7 dedicated' },
            ]?.map((item) => (
              <div key={item?.label} className="text-center lg:text-left">
                <div className="text-xl font-black text-[#4A6741] tracking-tight">{item?.val}</div>
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">{item?.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}