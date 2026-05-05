'use client';
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { ChevronLeft, ChevronRight, Download, Heart, RefreshCw, Zap, Ruler, CheckCircle2 } from "lucide-react";

export const ResultUI = () => {
  const { userImage, selectedOutfit, tryOnResult, setTryOnResult, addFavorite, favorites } = useStore();
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isFavorited = favorites.some(f => f.id === tryOnResult?.id);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const pos = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pos)));
  };

  if (!tryOnResult || !selectedOutfit) return null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <span className="text-white">Generated Look</span>
                <span className="px-2 py-0.5 rounded bg-[#bef264] text-black text-[10px] uppercase font-black tracking-widest">v2.1 Stable</span>
            </h2>
            <div className="flex items-center gap-2 text-white/40 text-xs mt-1">
                <CheckCircle2 className="w-3 h-3 text-[#bef264]" />
                Neural reconstruction complete (2.4s)
            </div>
        </div>
        <button onClick={() => setTryOnResult(null)} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
            <RefreshCw className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
            <div 
                ref={containerRef}
                className="relative aspect-[3/4] sm:aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden glass-panel border border-white/5 cursor-ew-resize select-none group shadow-2xl"
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={handleMove}
            >
                {/* Result Image (Background) */}
                <div className="absolute inset-0 w-full h-full">
                    <img src={tryOnResult.resultImage} className="w-full h-full object-cover" alt="Result" />
                </div>

                {/* Original Image (Foreground clip) */}
                <div 
                    className="absolute inset-0 h-full overflow-hidden border-r-2 border-[#bef264] z-10 shadow-2xl"
                    style={{ width: `${sliderPos}%` }}
                >
                    <img src={tryOnResult.originalImage} className="w-full h-full object-cover max-w-none" style={{ width: containerRef.current?.offsetWidth }} alt="Original" />
                </div>

                {/* Draggable Handle */}
                <div 
                    className="absolute top-0 bottom-0 w-1 bg-[#bef264]/50 pointer-events-none z-20 flex items-center justify-center"
                    style={{ left: `${sliderPos}%` }}
                >
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl border-4 border-black/10">
                        <ChevronLeft className="w-4 h-4 -ml-1" />
                        <ChevronRight className="w-4 h-4 -mr-1" />
                    </div>
                </div>

                <div className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] z-30">Original</div>
                <div className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-[#bef264] text-black text-[10px] font-bold uppercase tracking-[0.2em] z-30 shadow-[0_0_20px_rgba(190,242,100,0.5)]">AI Vision</div>
            </div>

            {/* Fit Result Badge (Simulated or from API) */}
            <div className="p-5 rounded-2xl bg-[#bef264]/10 border border-[#bef264]/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#bef264]/20 flex items-center justify-center">
                        <Ruler className="w-5 h-5 text-[#bef264]" />
                    </div>
                    <div>
                        <p className="text-white text-sm font-bold">Precision Fit Confirmed</p>
                        <p className="text-[#bef264]/60 text-xs">Fits <span className="text-[#bef264]">True to Size</span> at current measurements.</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="glass-panel p-6 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Garment Source</h3>
                <div className="flex gap-5">
                    <img src={selectedOutfit.imageUrl} className="w-20 h-24 object-cover rounded-xl border border-white/10" />
                    <div className="py-2">
                        <p className="text-[10px] font-bold text-[#bef264] uppercase mb-1">{selectedOutfit.category}</p>
                        <h4 className="text-white font-bold leading-tight mb-2">{selectedOutfit.name}</h4>
                        <p className="text-2xl font-black text-white">${selectedOutfit.price}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <button 
                  onClick={() => addFavorite(tryOnResult)} 
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isFavorited ? 'bg-zinc-800 text-[#bef264]' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
                >
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-[#bef264]' : ''}`} />
                    {isFavorited ? 'Saved' : 'Favorite'}
                </button>
                <a 
                    href={tryOnResult.resultImage} 
                    download 
                    className="w-full py-5 bg-[#bef264] text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-[#a3e635] shadow-[0_20px_40px_rgba(190,242,100,0.2)]"
                >
                    <Download className="w-5 h-5" />
                    Export Render
                </a>
            </div>
        </div>
      </div>
    </motion.div>
  );
};
