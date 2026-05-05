"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ImageUpload from "@/components/ImageUpload";
import OutfitSelection from "@/components/OutfitSelection";
import TryOnFlow from "@/components/TryOnFlow";
import ResultUI from "@/components/ResultUI";
import { useStore } from "@/store/useStore";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  const { userImage, userPhotoUrl, selectedOutfit, setIsProcessing, tryOnResult } = useStore();

  const handleTryOn = () => {
    if ((userImage || userPhotoUrl) && selectedOutfit) {
      setIsProcessing(true);
    }
  };

  return (
    <div className="w-full relative min-h-[calc(100vh-8rem)]">
      <TryOnFlow />
      
      <AnimatePresence mode="wait">
        {tryOnResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full flex justify-center py-6"
          >
            <ResultUI />
          </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full flex flex-col pt-8"
          >
            <div className="text-center mb-12 max-w-2xl mx-auto space-y-4">
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
                Virtual Try-On <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bef264] to-[#ecfccb]">Studio</span>
              </h1>
              <p className="text-lg text-white/60 font-medium">
                Upload a full-body photo, select a premium garment, and see how you look with our next-generation AI fitting technology.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full max-w-6xl mx-auto mb-24">
              <div className="lg:col-span-5 flex flex-col gap-6">
                <ImageUpload />
              </div>
              
              <div className="lg:col-span-7 flex flex-col gap-6">
                <OutfitSelection />
              </div>
            </div>
            
            {/* Try On Button - fixed at bottom and sticky */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-40 pointer-events-none">
              <div className="max-w-7xl mx-auto flex justify-center pointer-events-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={(!userImage && !userPhotoUrl) || !selectedOutfit}
                  onClick={handleTryOn}
                  className={`
                    group relative overflow-hidden rounded-full font-medium tracking-wide text-lg px-12 py-5 shadow-2xl transition-all duration-500
                    flex items-center gap-3 w-full sm:w-auto min-w-[300px] justify-center
                    ${(userImage || userPhotoUrl) && selectedOutfit
                      ? 'bg-gradient-to-r from-[#bef264] to-[#a3e635] text-white cursor-pointer hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] box-glow' 
                      : 'bg-white/10 text-white/30 cursor-not-allowed border-none'}
                  `}
                >
                  <div className={`absolute inset-0 bg-white/20 translate-y-full transition-transform duration-500 rounded-full ${(userImage || userPhotoUrl) && selectedOutfit ? 'group-hover:translate-y-0' : ''}`} />
                  
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Sparkles className={`w-5 h-5 ${(userImage || userPhotoUrl) && selectedOutfit ? 'animate-pulse' : ''}`} />
                    Virtual Try-On
                    <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
