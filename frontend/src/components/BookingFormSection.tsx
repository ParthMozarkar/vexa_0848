'use client';
import React, { useState } from 'react';
import CalendarPicker from './CalendarPicker';
import { Sparkles, Calendar, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];
const PLATFORMS = ['Shopify', 'WooCommerce', 'Custom React', 'Native Mobile', 'Other'];

interface FormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  companySize: string;
  platform: string;
  message: string;
}

const INITIAL: FormState = { name: '', email: '', phone: '', company: '', companySize: '', platform: '', message: '' };

type Step = 'form' | 'calendar' | 'confirmed';

export default function BookingFormSection() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<{ date: string; time: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('calendar');
  };

  const handleSlotSelect = async (date: string, time: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slotDate: date, slotTime: time }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Slot unavailable.'); setLoading(false); return; }
      setConfirmedSlot({ date, time });
      setStep('confirmed');
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <section id="booking-section" className="relative py-20 md:py-32 overflow-hidden bg-white/30">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80rem] h-[40rem] rounded-full blur-[120px] opacity-10" style={{ background: 'radial-gradient(circle, #4A6741 0%, transparent 70%)' }} />
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16 md:mb-24 animate-on-scroll">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[10px] font-black uppercase tracking-widest mb-6">
            <Sparkles className="w-3 h-3" />
            Get Started
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#1a1a1a] mb-6">
            Book a <span className="text-gradient-primary">live demo.</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-base md:text-lg leading-relaxed font-medium">
            See VEXA running inside your stack in under 30 minutes. No sales pitch — just a working integration.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          {/* Left: Stats Grid */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {[
              { value: '30 min', label: 'Average demo length', color: '#4A6741' },
              { value: '3 days', label: 'To full integration', color: '#8B7D3C' },
              { value: '40%+', label: 'Avg. conversion lift', color: '#6B8C5E' },
              { value: '200+', label: 'Brands already live', color: '#A69060' },
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-[2rem] p-8 flex flex-col gap-4 group hover:border-[#4A6741]/30 transition-all duration-500 bg-white shadow-2xl shadow-slate-200/10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: `${stat.color}10`, color: stat.color }}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tight mb-1" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{stat.label}</div>
                </div>
              </div>
            ))}
            
            <div className="sm:col-span-2 glass-card rounded-[2rem] p-8 bg-[#1a1a1a] text-white shadow-2xl shadow-slate-900/10 mt-4">
              <p className="text-sm md:text-base font-medium leading-relaxed mb-6 opacity-80">
                &ldquo;VEXA is the most developer-friendly 3D try-on solution we&apos;ve evaluated. The integration was seamless.&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800" />
                <div>
                  <div className="text-xs font-black uppercase tracking-widest">Sarah Chen</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">VP Engineering, StyleCo</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form / Calendar / Confirmation */}
          <div className="lg:col-span-7">
            <div className="relative">
              {error && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  {error}
                </div>
              )}

              {step === 'confirmed' ? (
                <div className="glass-card rounded-[3rem] p-10 md:p-16 flex flex-col items-center justify-center text-center h-full min-h-[500px] gap-8 bg-white shadow-2xl shadow-slate-200/20 border-2 border-[#4A6741]/20">
                  <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center bg-[#4A6741]/10 text-[#4A6741] shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-[#1a1a1a] mb-4 tracking-tight">You&apos;re booked!</h3>
                    {confirmedSlot && (
                      <div className="inline-block px-8 py-6 bg-slate-50 rounded-[2rem] border border-slate-100 mb-6">
                        <div className="text-[10px] font-black text-[#4A6741] uppercase tracking-[0.2em] mb-2">{formatDate(confirmedSlot.date)}</div>
                        <div className="text-3xl font-black text-[#1a1a1a] tracking-tight">{confirmedSlot.time}</div>
                      </div>
                    )}
                    <p className="text-slate-500 text-base leading-relaxed max-w-sm mx-auto font-medium">
                      We&apos;ve sent a confirmation to <strong className="text-[#1a1a1a]">{form.email}</strong>. Our team will reach out with meeting details.
                    </p>
                  </div>
                  <button onClick={() => { setStep('form'); setForm(INITIAL); setConfirmedSlot(null); setError(null); }} className="text-[10px] font-black text-[#4A6741] uppercase tracking-[0.2em] hover:text-[#1a1a1a] transition-colors underline underline-offset-8">
                    Submit another request
                  </button>
                </div>
              ) : step === 'calendar' ? (
                <div className="glass-card rounded-[3rem] p-8 md:p-12 bg-white shadow-2xl shadow-slate-200/20">
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-6 h-6 text-[#4A6741]" />
                      <h3 className="text-2xl font-black text-[#1a1a1a] tracking-tight">Pick your slot</h3>
                    </div>
                    <p className="text-slate-500 font-medium">Choose a date and time for your personalized demo.</p>
                  </div>
                  <CalendarPicker onSelect={handleSlotSelect} loading={loading} />
                  <button onClick={() => { setStep('form'); setError(null); }} className="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-[#1a1a1a] transition-colors flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 rotate-180" /> Back to form
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="glass-card rounded-[3rem] p-8 md:p-12 space-y-8 bg-white shadow-2xl shadow-slate-200/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Full Name</label>
                      <input type="text" name="name" required value={form.name} onChange={handleChange} placeholder="Alex Johnson" className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#1a1a1a] placeholder:text-slate-300 focus:outline-none focus:border-[#4A6741]/50 focus:ring-4 focus:ring-[#4A6741]/5 transition-all" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Work Email</label>
                      <input type="email" name="email" required value={form.email} onChange={handleChange} placeholder="alex@brand.com" className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#1a1a1a] placeholder:text-slate-300 focus:outline-none focus:border-[#4A6741]/50 focus:ring-4 focus:ring-[#4A6741]/5 transition-all" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Company</label>
                      <input type="text" name="company" required value={form.company} onChange={handleChange} placeholder="Your Brand Inc." className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#1a1a1a] placeholder:text-slate-300 focus:outline-none focus:border-[#4A6741]/50 focus:ring-4 focus:ring-[#4A6741]/5 transition-all" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Company Size</label>
                      <div className="relative">
                        <select name="companySize" value={form.companySize} onChange={handleChange} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#1a1a1a] focus:outline-none focus:border-[#4A6741]/50 focus:ring-4 focus:ring-[#4A6741]/5 transition-all appearance-none cursor-pointer">
                          <option value="">Select size</option>
                          {COMPANY_SIZES.map((s) => (<option key={s} value={s}>{s} employees</option>))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                          <ArrowRight className="w-4 h-4 rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Current Platform</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map((p) => (
                        <button key={p} type="button" onClick={() => setForm((prev) => ({ ...prev, platform: p }))}
                          className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${form.platform === p ? 'bg-[#4A6741] text-white border-[#4A6741] shadow-lg shadow-[#4A6741]/20' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Message (Optional)</label>
                    <textarea name="message" value={form.message} onChange={handleChange} rows={3} placeholder="e.g. We want to see how it handles plus-size body types..." className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-[#1a1a1a] placeholder:text-slate-300 focus:outline-none focus:border-[#4A6741]/50 focus:ring-4 focus:ring-[#4A6741]/5 transition-all resize-none" />
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-6 rounded-full font-black text-xs uppercase tracking-widest transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-70 bg-[#4A6741] text-white hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-[#4A6741]/30">
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Continue to Pick a Slot <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                  <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No commitment. No credit card. Just a 30-min call.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
