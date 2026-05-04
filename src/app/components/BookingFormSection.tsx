'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Send, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];
const PLATFORMS = ['Shopify', 'WooCommerce', 'Custom React', 'Native Mobile', 'Other'];
const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

export default function BookingFormSection() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    companySize: '',
    platform: '',
    slotDate: '',
    slotTime: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section id="book-demo" className="py-24 px-4 bg-white">
        <div className="max-w-xl mx-auto text-center glass-card p-12 border-[#4A6741]/20">
          <div className="w-20 h-20 bg-[#4A6741]/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10 text-[#4A6741]" />
          </div>
          <h2 className="text-3xl font-black text-[#1a1a1a] mb-4">Demo Confirmed!</h2>
          <p className="text-slate-500 mb-8">Check your email for the Google Meet link and calendar invitation.</p>
          <button onClick={() => setSubmitted(false)} className="text-[#4A6741] font-bold uppercase tracking-widest text-sm">
            Book another demo
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="book-demo" className="relative py-24 overflow-hidden bg-[#fdfdfc]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-10 bg-[#4A6741]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#4A6741] mb-4 block">Get Started</span>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-[#1a1a1a] mb-6">
            Book a <span className="text-[#4A6741]">live demo.</span>
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-lg font-medium leading-relaxed">
            See VEXA running inside your stack in under 30 minutes. Automated calendar & email integration included.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left Stats */}
          <div className="lg:col-span-2 flex flex-col gap-6 justify-center">
            {[
              { value: '30 min', label: 'Average demo length' },
              { value: '3 days', label: 'To full integration' },
              { value: '40%+', label: 'Avg. conversion lift' },
              { value: '200+', label: 'Brands already live' },
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-3xl p-6 flex items-center gap-5 group hover:border-[#4A6741]/30 transition-all shadow-lg shadow-slate-200/50 bg-white">
                <div className="w-1.5 h-12 rounded-full bg-[#4A6741]" />
                <div>
                  <div className="text-3xl font-black text-[#4A6741] tracking-tight">{stat.value}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="glass-card rounded-[40px] p-8 md:p-12 space-y-8 bg-white border-slate-100 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                  <input required type="text" placeholder="John Doe" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] focus:ring-0 transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Work Email</label>
                  <input required type="email" placeholder="john@company.com" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] focus:ring-0 transition-all" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Company</label>
                  <input required type="text" placeholder="Your Brand" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] transition-all" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Platform</label>
                  <select className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] transition-all" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
                    <option value="">Select Platform</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><Calendar className="w-3 h-3" /> Select Date</label>
                  <input required type="date" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] transition-all" value={form.slotDate} onChange={e => setForm({...form, slotDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><Clock className="w-3 h-3" /> Select Time</label>
                  <select required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] transition-all" value={form.slotTime} onChange={e => setForm({...form, slotTime: e.target.value})}>
                    <option value="">Choose a slot</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <button disabled={loading} type="submit" className="w-full py-5 rounded-2xl bg-[#4A6741] text-white font-bold text-lg hover:shadow-2xl hover:shadow-[#4A6741]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? "Syncing Calendar..." : "Confirm My Demo"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
