"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shirt, Sparkles, Clock, User, Trash2, ExternalLink, 
  BarChart3, Activity, PieChart, Users, ArrowUpRight 
} from 'lucide-react';

export default function AdminDashboard() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [tryons, setTryons] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDesigns: 0,
    totalTryons: 0,
    totalTNB: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    
    // 1. Fetch Designs (Newest First)
    const { data: dData } = await supabase.from('design_history').select('*').order('created_at', { ascending: false });
    
    // 2. Fetch Try-ons (Newest First)
    const { data: tData } = await supabase.from('tryon_results').select('*').order('created_at', { ascending: false });
    
    // 3. Fetch TNB Usage Logs (Total count)
    const { count: tnbCount } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('provider', 'blackbox');

    if (dData) setDesigns(dData);
    if (tData) setTryons(tData);
    
    setStats({
      totalDesigns: dData?.length || 0,
      totalTryons: tData?.length || 0,
      totalTNB: tnbCount || 0,
      activeUsers: new Set([...(dData?.map(d => d.user_id) || []), ...(tData?.map(t => t.user_id) || [])]).size
    });
    
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

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
        
        {/* HEADER & ANALYTICS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
          <div>
            <h1 className="text-5xl font-black tracking-tight mb-2">Vexa <span className="text-[#4A6741]">Admin</span></h1>
            <p className="text-slate-400 font-medium">Real-time platform analytics and generation history.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
            <StatCard label="Total Designs" value={stats.totalDesigns} icon={<Sparkles className="w-4 h-4" />} />
            <StatCard label="TNB Try-ons" value={stats.totalTNB} icon={<Shirt className="w-4 h-4" />} />
            <StatCard label="Stored Results" value={stats.totalTryons} icon={<PieChart className="w-4 h-4" />} />
            <StatCard label="Total Users" value={stats.activeUsers} icon={<Users className="w-4 h-4" />} />
          </div>
        </div>

        {/* MAIN FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* AI DESIGNS FEED */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#4A6741]" /> Live Design Feed
              </h2>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Newest First</span>
            </div>

            {loading ? <div className="animate-pulse bg-white h-40 rounded-[2.5rem]" /> : 
              designs.map(item => (
                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 hover:shadow-2xl transition-all">
                  <div className="flex gap-6">
                    <div className="relative group flex-shrink-0">
                      <img src={item.result_url} className="w-32 h-32 rounded-2xl object-cover bg-slate-50 border border-slate-50 shadow-sm" />
                      <button onClick={() => window.open(item.result_url)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                        <ExternalLink className="text-white w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-3 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[9px] font-black uppercase tracking-widest">{item.category}</span>
                        <button onClick={() => deleteDesign(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <p className="text-xs font-bold text-[#1a1a1a] mb-2 line-clamp-2 italic">"{item.original_prompt}"</p>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">AI-Refined Details</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{item.ai_prompt}</p>
                      </div>
                      <p className="text-[9px] text-slate-300 mt-3 font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            }
          </div>

          {/* TRY-ON FEED */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#4A6741]" /> Live Try-On Feed
              </h2>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Newest First</span>
            </div>

            {loading ? <div className="animate-pulse bg-white h-40 rounded-[2.5rem]" /> : 
              tryons.map(item => (
                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 hover:shadow-2xl transition-all">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-slate-300">User</p>
                      <img src={item.user_photo_url} className="w-full h-24 rounded-xl object-cover bg-slate-50 border border-slate-50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-slate-300">Garment</p>
                      <img src={item.garment_url} className="w-full h-24 rounded-xl object-cover bg-slate-50 border border-slate-50" />
                    </div>
                    <div className="space-y-1 relative group">
                      <p className="text-[8px] font-black uppercase text-[#4A6741]">Output</p>
                      <img src={item.result_url} className="w-full h-24 rounded-xl object-cover bg-slate-100 border border-[#4A6741]/20 shadow-sm" />
                      <button onClick={() => window.open(item.result_url)} className="absolute inset-x-0 bottom-0 top-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <ExternalLink className="text-white w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.user_id.slice(0,12)}...</span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleString()}</span>
                      <button onClick={() => deleteTryon(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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

function StatCard({ label, value, icon }: { label: string, value: number, icon: any }) {
  return (
    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col items-start gap-1">
      <div className="w-8 h-8 rounded-full bg-[#4A6741]/10 flex items-center justify-center text-[#4A6741] mb-1">
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-black text-[#1a1a1a]">{value}</p>
        <ArrowUpRight className="w-3 h-3 text-[#4A6741]" />
      </div>
    </div>
  );
}
