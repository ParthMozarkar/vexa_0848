'use client';
import React from 'react';
import { Sparkles, ArrowRight, Layers, UserCheck, Code2, Zap, Globe, BarChart3 } from 'lucide-react';

const features = [
  {
    id: '3d-viz',
    title: '3D Visualization',
    desc: 'Photorealistic garment rendering with fabric physics, lighting simulation, and dynamic shadow casting.',
    tag: 'Core Engine',
    accent: '#4A6741',
    colSpan: 'lg:col-span-1',
    icon: <Layers className="w-5 h-5" />,
    visual: (
      <div className="relative h-32 flex items-center justify-center">
        <div className="w-20 h-20 rounded-3xl border border-[#4A6741]/20 flex items-center justify-center bg-[#4A6741]/5">
          <div className="w-10 h-10 rounded-2xl bg-[#4A6741]/20 animate-pulse" />
        </div>
        {[0,1,2]?.map(i => (
          <div key={i} className="absolute rounded-full border border-[#4A6741]/10" style={{ width: `${(i+2)*50}px`, height: `${(i+2)*50}px`, animation: `pulse ${2+i}s infinite` }} />
        ))}
      </div>
    ),
  },
  {
    id: 'ai-body',
    title: 'AI Body Mapping',
    desc: '68-point skeletal analysis from a single photo. Works across 200+ body types with 99.2% dimensional accuracy.',
    tag: 'AI Core',
    accent: '#6B8C5E',
    colSpan: 'lg:col-span-1',
    icon: <UserCheck className="w-5 h-5" />,
    visual: (
      <div className="relative h-32 flex items-center justify-center">
        <svg viewBox="0 0 80 100" className="w-16 h-20 opacity-40">
          <circle cx="40" cy="12" r="8" fill="none" stroke="#6B8C5E" strokeWidth="2" />
          <line x1="40" y1="20" x2="40" y2="55" stroke="#6B8C5E" strokeWidth="2" />
          <line x1="40" y1="30" x2="20" y2="45" stroke="#6B8C5E" strokeWidth="2" />
          <line x1="40" y1="30" x2="60" y2="45" stroke="#6B8C5E" strokeWidth="2" />
          <line x1="40" y1="55" x2="28" y2="80" stroke="#6B8C5E" strokeWidth="2" />
          <line x1="40" y1="55" x2="52" y2="80" stroke="#6B8C5E" strokeWidth="2" />
          {[[40,12],[20,45],[60,45],[28,80],[52,80],[40,35],[40,55]]?.map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="3" fill="#6B8C5E" />
          ))}
        </svg>
      </div>
    ),
  },
  {
    id: 'integration',
    title: 'Easy Integration',
    desc: 'Drop-in SDK for React, Vue, and native mobile. Full REST API for custom implementations.',
    tag: 'Dev Ready',
    accent: '#8B7D3C',
    colSpan: 'lg:col-span-1',
    icon: <Code2 className="w-5 h-5" />,
    visual: (
      <div className="relative h-32 p-6 font-mono text-[11px] overflow-hidden bg-slate-50 rounded-2xl border border-slate-100 mt-2">
        <div className="text-slate-400 mb-2">// 3 lines to integrate</div>
        <div className="space-y-1">
          <div><span className="text-[#4A6741]">import</span> <span className="text-[#1a1a1a] font-bold">VEXA</span> <span className="text-[#4A6741]">from</span> <span className="text-[#4A6741]/60">&apos;@vexa/sdk&apos;</span></div>
          <div><span className="text-[#4A6741]">const</span> <span className="text-[#1a1a1a] font-bold">sdk</span> = <span className="text-[#1a1a1a] font-bold">VEXA</span>.init(<span className="text-[#4A6741]/60">&apos;key&apos;</span>)</div>
          <div><span className="text-[#1a1a1a] font-bold">sdk</span>.render(<span className="text-[#4A6741]/60">&apos;#container&apos;</span>)</div>
        </div>
      </div>
    ),
  },
  {
    id: 'realtime',
    title: 'Real-time Rendering Engine',
    desc: 'Sub-200ms render times powered by distributed GPU clusters. Stream photorealistic garment previews to any device, anywhere, at any scale.',
    tag: '<200ms p99',
    accent: '#4A6741',
    colSpan: 'lg:col-span-2',
    icon: <Zap className="w-5 h-5" />,
    visual: (
      <div className="h-24 flex items-end gap-1.5 px-4">
        {[45, 62, 38, 71, 55, 80, 48, 67, 52, 75, 44, 68, 59, 82, 50, 73, 46, 70, 55, 78, 42]?.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-lg transition-all duration-500"
            style={{
              height: `${h * 0.3}px`,
              background: i % 4 === 0 ? '#4A6741' : '#4A674130',
            }}
          />
        ))}
      </div>
    ),
  },
  {
    id: 'multibrand',
    title: 'Multi-brand Support',
    desc: 'One integration powers unlimited brands. White-label ready with custom theming per storefront.',
    tag: 'Enterprise',
    accent: '#6B8C5E',
    colSpan: 'lg:col-span-1',
    icon: <Globe className="w-5 h-5" />,
    visual: (
      <div className="h-24 flex items-center justify-center gap-4">
        {['A','B','C'].map((l, i) => (
          <div key={i} className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-xl"
            style={{ background: 'white', color: '#1a1a1a', border: '1px solid #f1f5f9' }}>
            {l}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'analytics',
    title: 'Insights Dashboard',
    desc: 'Track try-on engagement, conversion lift, and return rate delta across every SKU. Exportable reports for your team.',
    tag: 'Intelligence',
    accent: '#8B7D3C',
    colSpan: 'lg:col-span-3',
    icon: <BarChart3 className="w-5 h-5" />,
    visual: (
      <div className="flex justify-around items-end h-24 px-8">
        {[
          { label: 'Try-ons', val: '2.4M', color: '#4A6741' },
          { label: 'Conversions', val: '+312%', color: '#8B7D3C' },
          { label: 'Return ↓', val: '40%', color: '#6B8C5E' },
          { label: 'Accuracy', val: '99.2%', color: '#4A6741' },
        ]?.map((stat, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="text-2xl font-black tracking-tight" style={{ color: stat?.color }}>{stat?.val}</div>
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{stat?.label}</div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function FeaturesSection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-white/30">
      {/* Ghost watermark */}
      <div
        className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none select-none w-full text-center z-0 overflow-hidden"
        style={{
          maskImage: 'linear-gradient(180deg, transparent, black 10%, black 70%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, black 10%, black 70%, transparent)',
        }}
      >
        <span className="text-[15vw] md:text-[10rem] font-black whitespace-nowrap tracking-tighter opacity-5 uppercase">
          Capabilities
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div
          className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-16 md:mb-24 animate-on-scroll"
          style={{ animation: 'animationIn 0.8s ease-out 0.2s forwards', opacity: 0 }}
        >
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[10px] font-black uppercase tracking-widest mb-6">
              <Sparkles className="w-3 h-3" />
              Features
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#1a1a1a]">
              Built for scale.<br />
              <span className="text-gradient-primary">Designed for precision.</span>
            </h2>
          </div>
          <p className="text-slate-500 max-w-sm text-base md:text-lg leading-relaxed font-medium">
            Every component is engineered for enterprise fashion platforms — from indie D2C to global retail groups.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features?.map((feature, i) => (
            <div
              key={feature?.id}
              className={`relative glass-card rounded-[2.5rem] p-8 md:p-10 group hover:border-[#4A6741]/30 transition-all duration-700 overflow-hidden opacity-100 animate-on-scroll bg-white shadow-2xl shadow-slate-200/10 ${feature?.colSpan}`}
              style={{
                animation: `animationIn 0.8s ease-out ${0.2 + i * 0.1}s forwards`,
                opacity: 0,
              }}
            >
              {/* Subtle glow on hover */}
              <div
                className="absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 50%, ${feature?.accent}08 0%, transparent 70%)` }}
              />

              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:rotate-6"
                    style={{ background: `${feature?.accent}10`, color: feature?.accent }}
                  >
                    {feature?.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#1a1a1a] tracking-tight">{feature?.title}</h3>
                    <span
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mt-1 inline-block"
                      style={{ background: `${feature?.accent}10`, color: feature?.accent }}
                    >
                      {feature?.tag}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual */}
              <div className="mb-6">
                {feature?.visual}
              </div>

              <p className="text-sm md:text-base text-slate-500 leading-relaxed font-medium">{feature?.desc}</p>
              
              <div className="mt-8 flex items-center gap-2 text-[#4A6741] text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all group-hover:gap-3 cursor-pointer">
                Technical Specs <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}