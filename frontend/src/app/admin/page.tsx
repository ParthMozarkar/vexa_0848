"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
<<<<<<< HEAD
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import { Shirt, Sparkles, Clock, User, Hash } from 'lucide-react';
=======
import {
  BarChart3,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  RefreshCcw,
  Zap,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

interface UsageLog {
  id: string;
  timestamp: string;
  user_id: string;
  provider: string;
  status: string;
  error_message: string;
  latency_ms: number;
  ip_address: string;
  device_info: string;
  user_email: string;
}
>>>>>>> 821fe4dede1aae9a71e256226afd18c2f9ceeeb5

export default function AdminDashboard() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [tryons, setTryons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
=======
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    avgLatency: 0
  });

  const [tnbTotal, setTnbTotal] = useState(0);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default credentials - you can move these to .env later
    if (username === "admin" && password === "vexa@123") {
      setIsAuthenticated(true);
      setLoginError(false);
      localStorage.setItem("vexa_admin_auth", "true");
    } else {
      setLoginError(true);
    }
  };
>>>>>>> 821fe4dede1aae9a71e256226afd18c2f9ceeeb5

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
<<<<<<< HEAD
=======

    // TNB total successful generations
    const { count } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('provider', 'blackbox')
      .eq('status', 'success');

    setTnbTotal(count ?? 0);

    setLoading(false);
  };

  useEffect(() => {
>>>>>>> 821fe4dede1aae9a71e256226afd18c2f9ceeeb5
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

<<<<<<< HEAD
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
=======
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Requests', value: stats.total, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Successful', value: stats.success, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Failed/Error', value: stats.failed, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
            { label: 'Avg Latency', value: `${(stats.avgLatency / 1000).toFixed(1)}s`, icon: Clock, color: 'text-[#4A6741]', bg: 'bg-lime-50' }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col gap-4"
            >
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-[#1a1a1a] mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* TNB Engine Stats */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-[#1a1a1a] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#4A6741]" />
              TheNewBlack AI Engine
            </h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              Provider: blackbox · TNB API
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/20 flex flex-col gap-3"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Successful Try-Ons</span>
              <span className="text-4xl font-black text-[#4A6741]">{tnbTotal}</span>
              <span className="text-xs text-slate-400 font-medium">All-time via TNB API</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/20 flex flex-col gap-3"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Success Rate</span>
              <span className="text-4xl font-black text-[#1a1a1a]">
                {stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0'}%
              </span>
              <span className="text-xs text-slate-400 font-medium">{stats.success} of {stats.total} requests</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/20 flex flex-col gap-3"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Generation Time</span>
              <span className="text-4xl font-black text-[#1a1a1a]">{(stats.avgLatency / 1000).toFixed(1)}s</span>
              <span className="text-xs text-slate-400 font-medium">Target: &lt;15s with hedging</span>
            </motion.div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#1a1a1a] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#4A6741]" />
              Recent Activity
            </h2>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Last 100 requests
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date &amp; Time</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User / Email</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Location (IP)</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Device</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-300 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-slate-600">
                            {new Date(log.timestamp).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-slate-300" />
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
                            {log.user_id}
                          </span>
                        </div>
                        {log.user_email && (
                          <span className="text-[10px] text-slate-400 ml-5 font-medium">{log.user_email}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        {log.ip_address || '—'}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        {log.device_info ? (
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            log.device_info === 'Mac' ? 'bg-indigo-50 text-indigo-500' :
                            log.device_info === 'Windows' ? 'bg-sky-50 text-sky-500' :
                            log.device_info === 'iOS' || log.device_info === 'Android' ? 'bg-orange-50 text-orange-500' :
                            'bg-slate-50 text-slate-400'
                          }`}>
                            {log.device_info}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      {log.status === 'success' ? (
                        <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-rose-500 text-[10px] font-black uppercase">
                            <XCircle className="w-3 h-3" />
                            Error
                          </div>
                          <span className="text-[9px] text-rose-400 truncate max-w-[150px]">
                            {log.error_message}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-4 text-xs font-bold text-slate-600">
                      {(log.latency_ms / 1000).toFixed(2)}s
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium">
                      No logs found yet. Start using the Try-On tool to see data!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
>>>>>>> 821fe4dede1aae9a71e256226afd18c2f9ceeeb5
        </div>
      </div>
    </div>
  );
}
