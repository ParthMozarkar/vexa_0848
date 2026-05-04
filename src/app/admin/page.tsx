"use client";

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  ShieldCheck,
  RefreshCcw,
  Key
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
  api_key_index: number;
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default credentials - you can move these to .env later
    if (username === "admin" && password === "vexa_admin_2024") {
      setIsAuthenticated(true);
      setLoginError(false);
      localStorage.setItem("vexa_admin_auth", "true");
    } else {
      setLoginError(true);
    }
  };

  useEffect(() => {
    const isAuth = localStorage.getItem("vexa_admin_auth");
    if (isAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usage_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      const logsData = data as UsageLog[];
      setLogs(logsData);
      
      const total = logsData.length;
      const success = logsData.filter(l => l.status === 'success').length;
      const failed = logsData.filter(l => l.status === 'error').length;
      const avgLatency = total > 0 
        ? Math.round(logsData.reduce((acc, l) => acc + (l.latency_ms || 0), 0) / total) 
        : 0;

      setStats({ total, success, failed, avgLatency });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {!isAuthenticated ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full p-10 rounded-[3rem] bg-white border border-slate-100 shadow-2xl shadow-slate-200/50"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-[#4A6741] flex items-center justify-center text-white shadow-xl shadow-[#4A6741]/20 mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-[#1a1a1a]">Admin Login</h1>
              <p className="text-slate-500 text-sm font-medium mt-2">Enter credentials to access Vexa Analytics</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:border-[#4A6741] transition-all text-sm font-bold"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:border-[#4A6741] transition-all text-sm font-bold"
                  placeholder="••••••••"
                />
              </div>
              
              {loginError && (
                <p className="text-rose-500 text-xs font-bold text-center">Invalid username or password</p>
              )}

              <button 
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#4A6741] text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-[#4A6741]/20 hover:scale-[1.02] transition-all"
              >
                Access Dashboard
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 px-6 pt-32 pb-20 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-[#1a1a1a]">
              Admin <span className="text-[#4A6741]">Analytics</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2">
              Monitor Vexa AI usage, performance, and error rates.
            </p>
          </div>
          
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

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
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Provider</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Latency</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Key Idx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-4 text-xs font-medium text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-slate-300" />
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
                          {log.user_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                        {log.provider}
                      </span>
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
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                        <Key className="w-3 h-3" />
                        {log.api_key_index}
                      </div>
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
        </div>
        </div>
      )}
      <Footer />
    </main>
  );
}
