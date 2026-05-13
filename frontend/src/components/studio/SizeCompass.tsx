import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

interface SizeCompassProps {
  personUrl: string | null;
}

export function SizeCompass({ personUrl }: SizeCompassProps) {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete'>('idle');

  useEffect(() => {
    if (personUrl) {
      setStatus('analyzing');
      // Simulate 68-point AI scan
      const timer = setTimeout(() => {
        setStatus('complete');
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setStatus('idle');
    }
  }, [personUrl]);

  if (!personUrl) return null;

  return (
    <div className="mt-4 bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/40 p-5 overflow-hidden relative">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4A6741]/10 flex items-center justify-center">
            <Ruler className="w-4 h-4 text-[#4A6741]" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#1a1a1a]">AI Size Compass</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Demo Preview</p>
          </div>
        </div>
        {status === 'complete' && (
          <div className="bg-[#bef264]/20 text-[#4A6741] px-2 py-1 rounded text-[10px] font-bold">
            99.2% Match
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {status === 'analyzing' && (
          <motion.div 
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-4"
          >
            <Activity className="w-6 h-6 text-[#4A6741] animate-pulse mb-3" />
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#4A6741]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.5, ease: "linear" }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium animate-pulse">Scanning skeletal structure...</p>
          </motion.div>
        )}

        {status === 'complete' && (
          <motion.div 
            key="complete"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 rounded-xl p-2 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Chest</p>
                <p className="text-sm font-black text-[#1a1a1a]">44"</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Waist</p>
                <p className="text-sm font-black text-[#1a1a1a]">38"</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inseam</p>
                <p className="text-sm font-black text-[#1a1a1a]">32"</p>
              </div>
            </div>

            <div className="bg-[#4A6741]/5 border border-[#4A6741]/20 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#4A6741] shrink-0" />
              <div>
                <p className="text-xs text-slate-600 font-medium">Recommended Size</p>
                <p className="text-base font-black text-[#4A6741]">Large (L)</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
