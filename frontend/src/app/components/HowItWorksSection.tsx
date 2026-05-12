import React from 'react';
import AppImage from '@/components/ui/AppImage';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
  {
    num: '01',
    title: 'Upload Body Photo',
    desc: 'Customer submits a single full-body photo. Our AI processes it in under 2 seconds — no special equipment needed.',
    detail: '1 photo → 3D model',
    image: "https://images.unsplash.com/flagged/photo-1556138723-8f1bf9a28be4",
    imageAlt: 'Person taking a photo against a bright white wall',
    accent: '#4A6741'
  },
  {
    num: '02',
    title: 'Generate 3D Avatar',
    desc: 'VEXA builds a photorealistic digital twin using 68-point AI body mapping. Accurate proportions and posture.',
    detail: '68 mapping points',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1b669c127-1770082524794.png",
    imageAlt: '3D digital human avatar wireframe',
    accent: '#6B8C5E'
  },
  {
    num: '03',
    title: 'Try Any Outfit',
    desc: 'The avatar wears any garment from your catalog. Fabric drape and fit render realistically in real-time.',
    detail: 'Instant swap',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_14af37433-1777014634413.png",
    imageAlt: 'Fashion model wearing stylish outfit',
    accent: '#8B7D3C'
  }];


  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-white/50">
      {/* Ghost watermark */}
      <div
        className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none select-none text-center w-full z-0 overflow-hidden"
        style={{
          maskImage: 'linear-gradient(180deg, transparent, black 10%, black 70%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, black 10%, black 70%, transparent)'
        }}>
        
        <span className="text-[15vw] md:text-[10rem] font-black whitespace-nowrap tracking-tighter opacity-5 uppercase">
          How It Works
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div
          className="text-center mb-20 md:mb-24 opacity-100 animate-on-scroll"
          style={{ animation: 'animationIn 0.8s ease-out 0.2s forwards', opacity: 0 }}>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[10px] font-black uppercase tracking-widest mb-6">
            <Sparkles className="w-3 h-3" />
            The Process
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#1a1a1a]">
            Three steps.{' '}
            <span className="text-gradient-primary">Infinite fits.</span>
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-10">
          {steps?.map((step, i) =>
          <div
            key={i}
            className="relative glass-card rounded-[2.5rem] overflow-hidden group hover:border-[#4A6741]/30 transition-all duration-700 opacity-100 animate-on-scroll bg-white shadow-2xl shadow-slate-200/20"
            style={{
              animation: `animationIn 0.8s ease-out ${0.2 + i * 0.15}s forwards`,
              opacity: 0,
            }}>
            
              {/* Image */}
              <div className="relative h-64 md:h-56 lg:h-64 overflow-hidden">
                <AppImage
                src={step?.image}
                alt={step?.imageAlt}
                fill
                className="object-cover object-center group-hover:scale-110 transition-transform duration-1000"
                sizes="(max-width: 1024px) 100vw, 33vw" />
              
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-60" />
                
                {/* Step number overlay */}
                <div
                className="absolute top-6 left-6 text-7xl font-black font-mono leading-none pointer-events-none opacity-20"
                style={{ color: step?.accent }}>
                  {step?.num}
                </div>
                
                {/* Detail badge */}
                <div
                className="absolute bottom-6 right-6 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-md shadow-xl border"
                style={{ background: 'rgba(255,255,255,0.9)', color: step?.accent, borderColor: `${step?.accent}20` }}>
                  {step?.detail}
                </div>
              </div>

              {/* Content */}
              <div className="p-8 md:p-6 lg:p-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black font-mono shadow-inner transition-transform group-hover:rotate-6"
                style={{ background: `${step?.accent}10`, color: step?.accent }}>
                    {step?.num}
                  </div>
                  <h3 className="text-xl font-black text-[#1a1a1a] tracking-tight">{step?.title}</h3>
                </div>
                <p className="text-sm md:text-base text-slate-500 leading-relaxed font-medium">{step?.desc}</p>
                
                <div className="mt-8 flex items-center gap-2 text-[#4A6741] text-[10px] font-black uppercase tracking-widest group-hover:gap-3 transition-all cursor-pointer">
                  Learn More <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>);

}