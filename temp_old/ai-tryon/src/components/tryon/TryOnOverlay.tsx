'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarViewer } from '../AvatarViewer';
import { Ruler, Sparkles, X, ChevronRight, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const TryOnOverlay = ({ productId }: { productId: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { userImage, selectedOutfit } = useStore();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-3 bg-[#bef264] text-black px-6 py-4 rounded-2xl font-bold shadow-[0_10px_40px_rgba(190,242,100,0.4)] hover:scale-105 transition-all"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>Virtual Try-On</span>
            <div className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
          </motion.button>
        )}

        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.9 }}
            className="w-full max-w-[400px] h-[600px] bg-zinc-950 rounded-3xl border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#bef264] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                </div>
                <span className="text-white font-bold text-sm tracking-tight">VEXA Studio</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer */}
            <div className="flex-1 relative bg-black">
               <AvatarViewer avatarUrl={null} />
               <div className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
                   <p className="text-[#bef264] text-[10px] font-black uppercase tracking-widest mb-1">Fit Analysis</p>
                   <p className="text-white text-xs font-bold">Waiting for calibration...</p>
               </div>
            </div>

            {/* Footer */}
            <div className="p-6 space-y-4 bg-zinc-900/50">
               <div>
                  <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wider text-[10px] text-white/30">Active Product</h4>
                  <p className="text-white font-medium text-sm">Product #{productId}</p>
               </div>
               
               <button className="w-full py-4 bg-[#bef264] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#a3e635] transition-all">
                  <Ruler className="w-4 h-4" />
                  Personalize Fit
                  <ChevronRight className="w-4 h-4" />
               </button>
               <p className="text-center text-[10px] text-white/20 uppercase font-bold tracking-[0.2em] pt-2">Powered by VEXA Engine v2.0</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
