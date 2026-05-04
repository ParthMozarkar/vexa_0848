"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Box, Sparkles, Rocket, Clock } from 'lucide-react';

export default function ThreeDComingSoon() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 flex items-center justify-center px-6 pt-32 pb-20">
        <div className="max-w-4xl w-full">
          <div className="relative text-center">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#4A6741]/10 blur-[120px] rounded-full -z-10" />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4A6741]/5 border border-[#4A6741]/20 text-[#4A6741] text-xs font-black uppercase tracking-widest mb-8">
                <Sparkles className="w-3 h-3" />
                Next Generation Feature
              </div>
              
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-[#1a1a1a] leading-none mb-6">
                3D Virtual <br />
                <span className="text-[#4A6741]">Try-On</span>
              </h1>
              
              <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-12">
                We're building a hyper-realistic 3D garment simulation engine. 
                Experience digital fashion with high-precision physics and 
                360° visualization.
              </p>

              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
                {[
                  { icon: Box, label: '3D Simulation', status: 'In Development' },
                  { icon: Clock, label: 'Early Access', status: 'Q3 2024' },
                  { icon: Rocket, label: 'Engine Beta', status: 'Running' }
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="p-6 rounded-3xl bg-white/50 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/40 flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#4A6741] flex items-center justify-center text-white shadow-lg shadow-[#4A6741]/20">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-[#1a1a1a]">{item.label}</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                      {item.status}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <button className="w-full md:w-auto px-10 py-5 rounded-2xl bg-[#4A6741] text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-[#4A6741]/40 hover:scale-105 transition-all">
                  Join the Waitlist
                </button>
                <button className="w-full md:w-auto px-10 py-5 rounded-2xl bg-white text-slate-600 border border-slate-200 font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all">
                  View Roadmap
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
