"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import { Shirt, Sparkles, Clock, User, Trash2, ExternalLink } from 'lucide-react';

export default function AdminDashboard() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [tryons, setTryons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    // Fetch Designs (Newest First)
    const { data: dData } = await supabase
      .from('design_history')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch Try-ons (Newest First)
    const { data: tData } = await supabase
      .from('tryon_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (dData) setDesigns(dData);
    if (tData) setTryons(tData);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const deleteDesign = async (id: string) => {
    if (confirm('Delete this design permanently?')) {
      await supabase.from('design_history').delete().eq('id', id);
      fetchData();
    }
  };

  const deleteTryon = async (id: string) => {
    if (confirm('Delete this try-on permanently?')) {
      await supabase.from('tryon_results').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-[#1a1a1a]">
      <Header />
      <div className="pt-32 px-6 max-w-7xl mx-auto pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tight">Vexa <span className="text-[#4A6741]">Admin</span></h1>
            <p className="text-slate-400 font-medium mt-2">Monitor all generations, prompts, and results in real-time.</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Designs</p>
                <p className="text-3xl font-black text-[#4A6741]">{designs.length}</p>
             </div>
             <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Try-ons</p>
                <p className="text-3xl font-black text-[#4A6741]">{tryons.length}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 1. Design History Column */}
          <div className="space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#4A6741]" /> AI Designs</h2>
            {loading ? <div className="animate-pulse bg-white h-40 rounded-3xl" /> : 
              designs.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id} 
                  className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="flex gap-6">
                    <div className="relative group">
                      <img src={item.result_url} className="w-32 h-32 rounded-2xl object-cover bg-slate-50 border border-slate-100" />
                      <button onClick={() => window.open(item.result_url)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                        <ExternalLink className="text-white w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="px-3 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[9px] font-black uppercase tracking-widest">
                          {item.category}
                        </span>
                        <button onClick={() => deleteDesign(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-[#1a1a1a] line-clamp-2 italic">"{item.original_prompt}"</p>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">AI-Refined Prompt</p>
                        <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed">{item.ai_prompt}</p>
                      </div>
                      <p className="text-slate-300 text-[10px] flex items-center gap-1 font-bold uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            }
          </div>

          {/* 2. Try-on History Column */}
          <div className="space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2"><Shirt className="w-5 h-5 text-[#4A6741]" /> Virtual Try-Ons</h2>
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
                    <div className="space-y-1 relative group">
                      <p className="text-[8px] font-black uppercase text-[#4A6741]">Result</p>
                      <img src={item.result_url} className="w-full h-24 rounded-xl object-cover bg-slate-100" />
                      <button onClick={() => window.open(item.result_url)} className="absolute inset-0 top-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <ExternalLink className="text-white w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.user_id.slice(0, 15)}...</span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 font-bold uppercase tracking-wider"><Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleString()}</span>
                      <button onClick={() => deleteTryon(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
