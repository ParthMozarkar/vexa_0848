'use client';
import React, { useState } from 'react';
import AppImage from '@/components/ui/AppImage';
import { Sparkles, Zap, User, Code } from 'lucide-react';

const OUTFITS = [
{
  color: '#4A6741',
  label: 'Sage',
  images: [
  {
    src: "https://img.rocket.new/generatedImages/rocket_gen_img_127dffa64-1772150517318.png",
    alt: 'Fashion model wearing sage green outfit in studio'
  },
  {
    src: "https://img.rocket.new/generatedImages/rocket_gen_img_11dd6aade-1767159208582.png",
    alt: 'Fashion model side profile'
  }]

},
{
  color: '#8B7D3C',
  label: 'Olive',
  images: [
  {
    src: "https://img.rocket.new/generatedImages/rocket_gen_img_13d009c79-1774446338483.png",
    alt: 'Fashion model wearing olive outfit'
  },
  {
    src: "https://img.rocket.new/generatedImages/rocket_gen_img_1380919e7-1775817756683.png",
    alt: 'Fashion model in olive streetwear'
  }]

},
{
  color: '#6B8C5E',
  label: 'Forest',
  images: [
  {
    src: "https://images.unsplash.com/photo-1624810626198-f214d329f478",
    alt: 'Fashion model wearing forest green outfit'
  },
  {
    src: "https://img.rocket.new/generatedImages/rocket_gen_img_1924807a7-1773082167529.png",
    alt: 'Fashion model in forest streetwear'
  }]

}];


export default function DemoSection() {
  const [activeColor, setActiveColor] = useState(0);
  const [activeImage, setActiveImage] = useState(0);

  const currentOutfit = OUTFITS[activeColor];

  const handleColorChange = (idx: number) => {
    setActiveColor(idx);
    setActiveImage(0);
  };

  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-white/30">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div
          className="text-center mb-16 md:mb-20 animate-on-scroll"
          style={{ animation: 'animationIn 0.8s ease-out 0.2s forwards', opacity: 0 }}>
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#4A6741] mb-4 block">
            Product Demo
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#1a1a1a] mb-6">
            Try-on that{' '}
            <span className="text-gradient-primary">feels real.</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-base md:text-lg leading-relaxed font-medium">
            AI body mapping generates a photorealistic 3D avatar in seconds. Customers see exactly how each garment fits their body — not a mannequin.
          </p>
        </div>

        {/* Demo Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Phone mockup stack */}
          <div
            className="relative flex justify-center items-center h-[480px] md:h-[560px] animate-on-scroll"
            style={{ animation: 'animationIn 0.8s ease-out 0.3s forwards', opacity: 0 }}>

            {/* Glow */}
            <div
              className="absolute inset-0 rounded-full blur-[100px] pointer-events-none transition-all duration-1000"
              style={{ background: `radial-gradient(circle at center, ${currentOutfit.color}15 0%, transparent 70%)` }} />
            

            {/* Thumbnail strip - Horizontal on mobile, Vertical on desktop */}
            <div className="absolute -bottom-8 md:bottom-auto md:-left-4 lg:-left-8 md:top-1/2 md:-translate-y-1/2 flex flex-row md:flex-col gap-3 z-20">
              {currentOutfit.images.map((img, i) =>
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className="w-12 h-16 md:w-16 md:h-24 rounded-xl overflow-hidden border-2 transition-all duration-500 focus:outline-none hover:scale-110 shadow-lg"
                style={{
                  borderColor: activeImage === i ? currentOutfit.color : 'white',
                  boxShadow: activeImage === i ? `0 0 20px ${currentOutfit.color}30` : '0 4px 12px rgba(0,0,0,0.05)'
                }}
                aria-label={`View outfit image ${i + 1}`}>
                  <AppImage
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover object-top"
                  sizes="64px" />
                
                </button>
              )}
            </div>

            {/* Main phone frame */}
            <div
              className="relative w-[240px] h-[480px] md:w-[280px] md:h-[560px] rounded-[3rem] border-8 border-[#1a1a1a] overflow-hidden bg-[#1a1a1a] shadow-[0_0_80px_rgba(0,0,0,0.15)] z-10">
              {/* Screen */}
              <div className="w-full h-full relative bg-white overflow-hidden rounded-[2.25rem]">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a1a] rounded-b-2xl z-40" />

                {/* Scan line animation */}
                <div
                  className="absolute left-0 right-0 h-1 z-30 pointer-events-none animate-scan-line"
                  style={{ background: `linear-gradient(90deg, transparent, ${currentOutfit.color}, transparent)` }} />
                

                {/* Avatar image */}
                <AppImage
                  key={`${activeColor}-${activeImage}`}
                  src={currentOutfit.images[activeImage].src}
                  alt={currentOutfit.images[activeImage].alt}
                  fill
                  className="object-cover object-top transition-opacity duration-700"
                  sizes="280px" />
                

                {/* Overlay grid lines */}
                <div
                  className="absolute inset-0 z-20 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(${currentOutfit.color} 1px, transparent 1px), linear-gradient(90deg, ${currentOutfit.color} 1px, transparent 1px)`,
                    backgroundSize: '30px 30px'
                  }} />
                

                {/* Body mapping dots */}
                {[
                { top: '15%', left: '50%' },
                { top: '30%', left: '35%' },
                { top: '30%', left: '65%' },
                { top: '50%', left: '40%' },
                { top: '50%', left: '60%' },
                { top: '70%', left: '45%' },
                { top: '70%', left: '55%' }].
                map((pos, i) =>
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full border-2 z-30 transition-all duration-500 shadow-sm"
                  style={{
                    ...pos,
                    transform: 'translate(-50%, -50%)',
                    background: currentOutfit.color,
                    borderColor: 'white'
                  }} />

                )}

                {/* Top bar */}
                <div className="absolute top-8 left-0 right-0 px-6 z-30 flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-widest">VEXA Studio</span>
                  <span className="text-[10px] font-black text-[#4A6741] flex items-center gap-1.5 bg-[#4A6741]/10 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A6741] animate-pulse" />
                    LIVE
                  </span>
                </div>

                {/* Bottom outfit selector */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-30 bg-white/80 backdrop-blur-md border-t border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 mb-3 flex items-center justify-between uppercase tracking-widest">
                    <span>Colorway</span>
                    <span style={{ color: currentOutfit.color }}>{currentOutfit.label}</span>
                  </div>
                  <div className="flex gap-3">
                    {OUTFITS.map((outfit, i) =>
                    <button
                      key={i}
                      onClick={() => handleColorChange(i)}
                      className="w-8 h-8 rounded-full border-2 cursor-pointer transition-all duration-500 focus:outline-none hover:scale-125 shadow-sm"
                      style={{
                        background: outfit.color,
                        borderColor: activeColor === i ? 'white' : 'transparent',
                        boxShadow: activeColor === i ? `0 0 15px ${outfit.color}40` : 'none',
                        outline: activeColor === i ? `2px solid ${outfit.color}` : 'none'
                      }}
                      aria-label={`Select ${outfit.label} outfit`} />

                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary phone (Hidden on mobile) */}
            <div
              className="hidden md:block absolute w-[220px] h-[480px] rounded-[3rem] border border-slate-200 overflow-hidden glass-card opacity-30 z-0 transition-all duration-1000"
              style={{ transform: 'translateX(140px) translateY(40px) rotate(12deg)' }}>
              <AppImage
                src={currentOutfit.images[(activeImage + 1) % currentOutfit.images.length].src}
                alt={currentOutfit.images[(activeImage + 1) % currentOutfit.images.length].alt}
                fill
                className="object-cover object-top grayscale"
                sizes="220px" />
            </div>
          </div>

          {/* Right: Feature callouts */}
          <div
            className="space-y-6 md:space-y-8 animate-on-scroll mt-12 lg:mt-0"
            style={{ animation: 'animationIn 0.8s ease-out 0.4s forwards', opacity: 0 }}>
            {[
            {
              icon: <Zap className="w-5 h-5" />,
              color: '#4A6741',
              title: 'Real-time 3D Rendering',
              desc: 'Photorealistic garment simulation at 60fps. Fabric physics, lighting, and shadow — all computed in the cloud.',
              tag: '<200ms'
            },
            {
              icon: <User className="w-5 h-5" />,
              color: '#8B7D3C',
              title: 'AI Body Mapping',
              desc: '68-point skeletal mapping from a single photo. Accurate size predictions across 200+ body types.',
              tag: '99.2% accuracy'
            },
            {
              icon: <Code className="w-5 h-5" />,
              color: '#6B8C5E',
              title: 'Universal SDK Integration',
              desc: 'Three lines of code. Works with Shopify, WooCommerce, custom React apps, and native mobile.',
              tag: '3 lines of code'
            }].
            map((item, i) =>
            <div
              key={i}
              className="relative glass-card rounded-[2rem] p-6 md:p-8 flex items-start gap-6 group hover:border-[#4A6741]/30 transition-all duration-500 bg-white/40 shadow-xl shadow-slate-200/10">
                <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-110"
                style={{ background: `${item.color}10`, color: item.color }}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h3 className="text-base md:text-lg font-black text-[#1a1a1a] tracking-tight">{item.title}</h3>
                    <span
                    className="w-fit text-[10px] font-black font-mono px-3 py-1 rounded-full uppercase tracking-widest"
                    style={{ background: `${item.color}10`, color: item.color }}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>);

}