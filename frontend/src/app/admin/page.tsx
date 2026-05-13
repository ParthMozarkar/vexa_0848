"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import { Shirt, Sparkles, Clock, User, Hash } from 'lucide-react';

export default function AdminDashboard() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [tryons, setTryons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch Designs (Newest First)
      const { data: designData } = await supabase
        .from('design_history')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch Try-ons (Newest First)
      const { data: tryonData } = await supabase
        .from('tryon_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (designData) setDesigns(designData);
      if (tryonData) setTryons(tryonData);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-[#1a1a1a]">
      <Header />
      
      <div className="pt-32 px-6 max-w-7xl mx-auto pb-20">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Vexa <span className="text-[#4A6741]">Admin</span></h1>
            <p className="text-slate-400 font-medium mt-1">Real-time usage & generation history</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Designs</p>
                <p className="text-2xl font-black text-[#4A6741]">{designs.length}</p>
             </div>
             <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Try-ons</p>
                <p className="text-2xl font-black text-[#4A6741]">{tryons.length}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* 1. Design History Column */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#4A6741]" />
              <h2 className="text-xl font-black">Design Generation History</h2>
            </div>
            
            {loading ? <div className="animate-pulse bg-white h-40 rounded-3xl" /> : 
              designs.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id} 
                  className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="flex gap-6">
                    <img src={item.result_url} className="w-32 h-32 rounded-2xl object-cover bg-slate-50" alt="Design" />
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="px-3 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[9px] font-black uppercase tracking-widest">
                          {item.category}
                        </span>
                        <span className="text-slate-300 text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#1a1a1a] line-clamp-2 italic">"{item.original_prompt}"</p>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">AI-Refined Prompt</p>
                        <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed">{item.ai_prompt}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            }
          </section>

          {/* 2. Try-on History Column */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Shirt className="w-5 h-5 text-[#4A6741]" />
              <h2 className="text-xl font-black">Virtual Try-On History</h2>
            </div>

            {loading ? <div className="animate-pulse bg-white h-40 rounded-3xl" /> : 
              tryons.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id} 
                  className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-slate-300">User Photo</p>
                      <img src={item.user_photo_url} className="w-full h-24 rounded-xl object-cover bg-slate-50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-slate-300">Garment</p>
                      <img src={item.garment_url} className="w-full h-24 rounded-xl object-cover bg-slate-50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-[#4A6741]">Result</p>
                      <img src={item.result_url} className="w-full h-24 rounded-xl object-cover bg-slate-100" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.user_id}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </motion.div>
              ))
            }
          </section>
        </div>
      </div>
    </div>
  );
}
