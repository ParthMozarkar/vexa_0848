"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles, Clock } from "lucide-react";

interface ComingSoonOverlayProps {
  title: string;
  description: string;
}

export default function ComingSoonOverlay({ title, description }: ComingSoonOverlayProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 overflow-hidden">
      {/* Glassmorphism Background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-white/40 backdrop-blur-[12px]"
      />
      
      {/* Content Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-xl bg-white border border-white/50 shadow-2xl rounded-[3rem] p-10 md:p-16 text-center overflow-hidden"
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#4A6741]/0 via-[#4A6741]/40 to-[#4A6741]/0" />
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#4A6741]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#bef264]/5 rounded-full blur-3xl" />

        <div className="flex flex-col items-center gap-8">
          {/* Lock Icon with Animation */}
          <motion.div 
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-24 h-24 rounded-[2rem] bg-[#4A6741] flex items-center justify-center shadow-2xl shadow-[#4A6741]/30"
          >
            <Lock className="w-10 h-10 text-white" />
          </motion.div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              <Clock className="w-3 h-3" /> Early Access Coming Soon
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-[#1a1a1a]">
              {title}
            </h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-sm mx-auto">
              {description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <a 
              href="/#booking-section"
              className="w-full py-5 rounded-2xl bg-[#1a1a1a] text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
            >
              Get Early Access
            </a>
            <a 
              href="/"
              className="w-full py-5 rounded-2xl bg-white border border-slate-200 text-[#1a1a1a] font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all shadow-sm"
            >
              Back to Home
            </a>
          </div>

          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Exclusive to Vexa Enterprise
          </p>
        </div>
      </motion.div>

      {/* Lock Scroll when overlay is present */}
      <style jsx global>{`
        body {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
}
