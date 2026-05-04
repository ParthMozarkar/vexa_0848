"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Send, CheckCircle2, Loader2 } from "lucide-react";

const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

export default function BookingFormSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    slotDate: "",
    slotTime: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <section className="py-24 px-4 bg-white">
        <div className="max-w-xl mx-auto text-center glass-panel p-12 border-[#4A6741]/20">
          <div className="w-20 h-20 bg-[#4A6741]/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10 text-[#4A6741]" />
          </div>
          <h2 className="text-3xl font-black text-[#1a1a1a] mb-4">Demo Confirmed!</h2>
          <p className="text-slate-500 mb-8">Check your email for the Google Meet link and calendar invitation.</p>
          <button 
            onClick={() => setStatus("idle")}
            className="text-[#4A6741] font-bold uppercase tracking-widest text-sm"
          >
            Book another demo
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-4 bg-white border-y border-slate-100">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-[#4A6741] text-sm font-bold uppercase tracking-[0.2em] mb-4">Enterprise Access</p>
          <h2 className="text-5xl font-black text-[#1a1a1a] leading-tight mb-6">
            Ready to see it<br />in action?
          </h2>
          <p className="text-lg text-slate-500 mb-8">
            Schedule a 15-minute live demo. We'll show you how to integrate the SDK and custom-train the AI body models for your brand.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-slate-600 font-medium">
              <CheckCircle2 className="w-5 h-5 text-[#4A6741]" />
              Automated Email Confirmation
            </div>
            <div className="flex items-center gap-4 text-slate-600 font-medium">
              <CheckCircle2 className="w-5 h-5 text-[#4A6741]" />
              Google Calendar Invite Included
            </div>
            <div className="flex items-center gap-4 text-slate-600 font-medium">
              <CheckCircle2 className="w-5 h-5 text-[#4A6741]" />
              Dedicated Integration Support
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel p-8 md:p-12 border-slate-100 shadow-2xl shadow-slate-200">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="John Doe"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] focus:ring-0 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Work Email</label>
                <input 
                  required
                  type="email" 
                  placeholder="john@company.com"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] focus:ring-0 transition-all"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Company Name</label>
              <input 
                required
                type="text" 
                placeholder="Fashion Brand Co."
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] focus:ring-0 transition-all"
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Select Date
                </label>
                <input 
                  required
                  type="date" 
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] transition-all"
                  value={formData.slotDate}
                  onChange={e => setFormData({...formData, slotDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Select Time
                </label>
                <select 
                  required
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-[#4A6741] transition-all appearance-none"
                  value={formData.slotTime}
                  onChange={e => setFormData({...formData, slotTime: e.target.value})}
                >
                  <option value="">Choose a slot</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <button
              disabled={status === "loading"}
              type="submit"
              className="w-full py-5 rounded-2xl bg-[#4A6741] text-white font-bold text-lg hover:shadow-xl hover:shadow-[#4A6741]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {status === "loading" ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
              {status === "loading" ? "Confirming..." : "Book My Demo"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
