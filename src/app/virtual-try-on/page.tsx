"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Shirt, Sparkles, Upload } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function VirtualTryOnPage() {
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
            <Shirt className="w-4 h-4 text-[#4A6741]" />
            <span className="text-[#4A6741] text-[10px] font-black uppercase tracking-[0.2em]">AI Body Mapping</span>
          </motion.div>
          
          <h1 className="text-6xl md:text-8xl font-black text-[#1a1a1a] tracking-tighter leading-none mb-8">
            Virtual <span className="text-[#4A6741]">Body Studio.</span>
          </h1>
          
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-16 font-medium">
            Generate your photorealistic 3D avatar from a single photo. Get perfect fit recommendations for any brand.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="glass-panel p-12 rounded-[40px] border border-slate-200 shadow-xl flex flex-col items-center justify-center gap-6 group hover:border-[#4A6741]/30 transition-all cursor-pointer bg-white">
              <div className="w-20 h-20 rounded-3xl bg-[#4A6741]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-[#4A6741]" />
              </div>
              <h3 className="text-2xl font-black text-[#1a1a1a]">Upload Photo</h3>
              <p className="text-slate-400 text-sm">Full body photo works best for mapping</p>
            </div>
            
            <div className="glass-panel p-12 rounded-[40px] border border-slate-200 shadow-xl flex flex-col items-center justify-center gap-6 group hover:border-[#4A6741]/30 transition-all cursor-pointer bg-white opacity-50">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Shirt className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-300">Select Garment</h3>
              <p className="text-slate-300 text-sm">Choose from catalog (coming soon)</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
