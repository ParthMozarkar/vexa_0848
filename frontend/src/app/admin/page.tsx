"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import {
  Shirt, Sparkles, Clock, User, Trash2, ExternalLink,
  BarChart3, Activity, PieChart, Users, ArrowUpRight, RotateCcw, AlertCircle, ShieldCheck
} from 'lucide-react';

interface DesignRecord {
  id: string;
  user_id: string;
  result_url: string;
  category: string;
  original_prompt: string;
  ai_prompt: string;
  created_at: string;
}

interface TryOnRecord {
  id: string;
  user_id: string;
  user_photo_url: string;
  garment_url: string;
  product_image_url: string;
  result_url: string;
  fit_label: string;
  recommended_size: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);

  const [designs, setDesigns] = useState<DesignRecord[]>([]);
  const [tryons, setTryons] = useState<TryOnRecord[]>([]);
  const [stats, setStats] = useState({
    totalDesigns: 0,
    totalTryons: 0,
    totalTNB: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('vexa_admin_auth') === 'true') {
      setAuthed(true);
    }
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Designs (Newest First)
      const { data: dData, error: dError } = await supabase
        .from('design_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (dError) console.warn('Design history table might be missing', dError);

      // 2. Fetch Try-ons (Newest First)
      const { data: tData, error: tError } = await supabase
        .from('tryon_results')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (tError) console.warn('Tryon results table might be missing', tError);

      // 3. Fetch TNB Usage Logs
      const { count: tnbCount } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('provider', 'blackbox');

      const designs = (dData || []) as DesignRecord[];
      const tryons = (tData || []) as TryOnRecord[];

      setDesigns(designs);
      setTryons(tryons);
      
      setStats({
        totalDesigns: designs.length,
        totalTryons: tryons.length,
        totalTNB: tnbCount || 0,
        activeUsers: new Set([...designs.map(d => d.user_id), ...tryons.map(t => t.user_id)]).size
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (authed) fetchData(); }, [authed]);

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

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f8f7f2] flex items-center justify-center px-6">
        <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-2xl border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-[#4A6741] flex items-center justify-center text-white mx-auto mb-6">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-center mb-6">Admin Access</h1>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pw === 'vexa@123') { localStorage.setItem('vexa_admin_auth', 'true'); setAuthed(true); }
                else setPwError(true);
              }
            }}
            placeholder="Password"
            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#4A6741] text-sm font-bold mb-3"
          />
          {pwError && <p className="text-rose-500 text-xs font-bold text-center mb-3">Wrong password</p>}
          <button
            onClick={() => {
              if (pw === 'vexa@123') { localStorage.setItem('vexa_admin_auth', 'true'); setAuthed(true); }
              else setPwError(true);
            }}
            className="w-full py-4 rounded-2xl bg-[#4A6741] text-white font-black uppercase tracking-widest text-sm"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-[#1a1a1a]">
      <Header />
      
      <div className="pt-32 px-6 max-w-7xl mx-auto pb-20">
        
        {/* HEADER & ANALYTICS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-5xl font-black tracking-tight">Vexa <span className="text-[#4A6741]">Admin</span></h1>
              <button 
                onClick={fetchData} 
                disabled={loading}
                className="p-3 rounded-full bg-white shadow-sm border border-slate-100 hover:rotate-180 transition-all duration-500"
              >
                <RotateCcw className={`w-4 h-4 text-[#4A6741] ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-slate-400 font-medium italic">Newest generations appear first. Refresh to see live activity.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
            <StatCard label="Total Designs" value={stats.totalDesigns} icon={<Sparkles className="w-4 h-4" />} />
            <StatCard label="TNB Logs" value={stats.totalTNB} icon={<Shirt className="w-4 h-4" />} />
            <StatCard label="Stored Tryons" value={stats.totalTryons} icon={<PieChart className="w-4 h-4" />} />
            <StatCard label="Active Users" value={stats.activeUsers} icon={<Users className="w-4 h-4" />} />
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 font-bold text-sm">
            <AlertCircle className="w-5 h-5" /> {error}. Check if SQL tables are created.
          </div>
        )}

        {/* MAIN FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* AI DESIGNS FEED */}
          <div className="space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-[#4A6741]" /> Real-time Designs
            </h2>

            {loading && designs.length === 0 ? <div className="animate-pulse bg-white h-40 rounded-[2.5rem]" /> : 
              designs.length === 0 ? <EmptyState text="No designs generated yet" /> :
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
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">AI Prompt Refinement</p>
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
            <h2 className="text-xl font-black flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[#4A6741]" /> Real-time Try-Ons
            </h2>

            {loading && tryons.length === 0 ? <div className="animate-pulse bg-white h-40 rounded-[2.5rem]" /> : 
              tryons.length === 0 ? <EmptyState text="No try-on results stored yet" /> :
              tryons.map(item => (
                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={item.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 hover:shadow-2xl transition-all">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-slate-300">Person Photo</p>
                      {item.user_photo_url
                        ? <img src={item.user_photo_url} className="w-full h-28 rounded-xl object-cover bg-slate-50 border border-slate-100" />
                        : <div className="w-full h-28 rounded-xl bg-slate-100 flex items-center justify-center text-[8px] text-slate-300 font-bold">No photo</div>
                      }
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-slate-300">Garment</p>
                      {(item.garment_url || item.product_image_url)
                        ? <img src={item.garment_url || item.product_image_url} className="w-full h-28 rounded-xl object-cover bg-slate-50 border border-slate-100" />
                        : <div className="w-full h-28 rounded-xl bg-slate-100 flex items-center justify-center text-[8px] text-slate-300 font-bold">No garment</div>
                      }
                    </div>
                    <div className="space-y-1 relative group">
                      <p className="text-[8px] font-black uppercase text-[#4A6741]">Try-On Result</p>
                      <img src={item.result_url} className="w-full h-28 rounded-xl object-cover bg-slate-100 border border-[#4A6741]/20 shadow-sm" />
                      <button onClick={() => window.open(item.result_url)} className="absolute inset-x-0 bottom-0 top-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <ExternalLink className="text-white w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.user_id?.slice(0,12)}...</span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 font-black"><Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleString()}</span>
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

function StatCard({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) {
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-20 text-center bg-white/50 border border-dashed border-slate-200 rounded-[3rem]">
      <p className="text-slate-400 font-medium">{text}</p>
    </div>
  );
}
