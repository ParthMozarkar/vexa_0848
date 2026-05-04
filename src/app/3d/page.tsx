"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ThreeDPage() {
  return (
    <main className="min-h-screen bg-[#f8f7f2] overflow-x-hidden">
      <Header />
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4A6741]/10 border border-[#4A6741]/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-[#4A6741]" />
            <span className="text-[#4A6741] text-[10px] font-black uppercase tracking-[0.2em]">Live AR Engine</span>
          </motion.div>
          
          <h1 className="text-6xl md:text-8xl font-black text-[#1a1a1a] tracking-tighter leading-none mb-8">
            Next-Gen <span className="text-[#4A6741]">3D Try-On.</span>
          </h1>
          
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium">
            Experience garments in full 3D with real-time physics. Our AR engine maps fabric directly to your unique body type.
          </p>

          <div className="glass-panel p-4 rounded-[40px] border border-slate-200 shadow-2xl max-w-4xl mx-auto aspect-video flex items-center justify-center bg-white mb-20">
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <Zap className="w-12 h-12 animate-pulse text-[#4A6741]" />
              <p className="font-bold uppercase tracking-widest text-xs text-[#4A6741]">Initializing 3D Environment...</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
