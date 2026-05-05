'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaceCapture } from '@/components/FaceCapture';
import { OutfitSelection } from '@/components/OutfitSelection';
import { ResultUI } from '@/components/ResultUI';
import { useStore } from '@/store/useStore';
import { useTryOn } from '@/hooks/useTryOn';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, ArrowRight, Zap, Play } from 'lucide-react';

export default function StudioPage() {
  const { userImage, selectedOutfit, tryOnResult, setIsProcessing, isProcessing } = useStore();
  const { triggerTryOn } = useTryOn();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!userImage || !selectedOutfit || !user?.id) return;
    
    setError(null);
    setIsProcessing(true);
    
    try {
      // Trigger API call
      await triggerTryOn(selectedOutfit as any, user.id);
    } catch (err: any) {
      setError(err.message || "Try-on failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#bef264] selection:text-black pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        
        <AnimatePresence mode="wait">
          {tryOnResult ? (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <ResultUI />
            </motion.div>
          ) : (
            <motion.div key="studio" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
              
              <div className="text-center mb-16 space-y-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-2">
                   <Zap className="w-3 h-3 text-[#bef264]" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Neural Studio v2.0</span>
                </motion.div>
                <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white">
                    Virtual <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bef264] to-[#d9f99d]">Try-On</span>
                </h1>
                <p className="text-white/40 text-lg max-w-2xl mx-auto leading-relaxed">
                    Upload your profile photo, choose a garment from our digital catalogue, and let the AI compute your personalized fit.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-5">
                   <FaceCapture onCapture={() => {}} onClear={() => {}} />
                </div>
                <div className="lg:col-span-7">
                  <OutfitSelection />
                </div>
              </div>

              {/* Sticky Action Button */}
              <div className="fixed bottom-10 left-0 right-0 z-50 px-6 pointer-events-none">
                <div className="max-w-7xl mx-auto flex justify-center pointer-events-auto">
                   <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleProcess}
                      disabled={!userImage || !selectedOutfit || isProcessing}
                      className={`
                        group relative flex items-center gap-4 px-12 py-6 rounded-2xl font-black text-xl uppercase tracking-widest transition-all duration-500 shadow-2xl
                        ${userImage && selectedOutfit 
                          ? 'bg-[#bef264] text-black shadow-[0_20px_60px_rgba(190,242,100,0.4)]' 
                          : 'bg-zinc-900 text-white/20 cursor-not-allowed border border-white/5'}
                      `}
                   >
                      {isProcessing ? (
                        <>
                          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="w-6 h-6 fill-current" />
                          Run Virtual Try-On
                          <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                        </>
                      )}
                   </motion.button>
                </div>
              </div>

              {error && (
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-red-500 text-white font-bold text-sm shadow-2xl animate-bounce">
                  {error}
                </div>
              )}
            </motion.div>
          ) || null}
        </AnimatePresence>

      </div>
    </div>
  );
}
