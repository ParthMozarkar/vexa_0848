'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Download, AlertCircle, Sparkles, X, ArrowRight, RotateCcw } from 'lucide-react';
import { ImageUploadBox } from '@/components/studio/ImageUploadBox';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────

type DesignStep = 'design' | 'tryon';
type DesignStatus =
  | 'idle'
  | 'fetching_trends'
  | 'generating_design'
  | 'uploading_photo'
  | 'generating_tryon'
  | 'ready'
  | 'error';

interface TrendResult {
  title: string;
  content: string;
  designPrompt: string;
}

interface DesignApiResponse {
  designImageUrl?: string;
  error?: string;
}

interface TrendsApiResponse {
  trends?: TrendResult[];
  error?: string;
}

interface TryOnApiResponse {
  result_url?: string;
  resultUrl?: string;
  error?: string;
}

const STYLES = ['Minimalist', 'Traditional', 'Streetwear', 'Formal', 'Casual', 'Luxury'];

const DESIGN_CATEGORIES = [
  { id: 'tops', label: 'Tops' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'one-pieces', label: 'Dresses' },
  { id: 'shoes', label: 'Shoes' },
];

const EXAMPLE_PROMPTS = [
  'Structured blazer in charcoal grey with peak lapels',
  'Flowing silk kurta in midnight blue with gold embroidery',
  'Oversized olive green hoodie with minimal branding',
  'Floral summer dress with puff sleeves and white base',
  'Classic white shirt with mandarin collar, relaxed fit',
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DesignPage() {
  const { currentUser } = useStore();
  const router = useRouter();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string | null>('Minimalist');
  const [category, setCategory] = useState('tops');
  const [step, setStep] = useState<DesignStep>('design');
  const [status, setStatus] = useState<DesignStatus>('idle');
  const [designImageUrl, setDesignImageUrl] = useState<string | null>(null);
  const [personUrl, setPersonUrl] = useState<string | null>(null);
  const [tryOnResultUrl, setTryOnResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Trend state
  const [trends, setTrends] = useState<TrendResult[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendResult | null>(null);
  const [showTrends, setShowTrends] = useState(false);

  const startTimer = () => {
    setElapsedSec(0);
    timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleFetchTrends = useCallback(async () => {
    if (prompt.trim().length < 3) return;
    setStatus('fetching_trends');
    setErrorMsg(null);
    setTrends([]);
    setSelectedTrend(null);
    setShowTrends(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/studio/trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ query: prompt.trim(), style: style ?? undefined, category }),
      });
      const data = (await res.json()) as TrendsApiResponse;
      const results = data.trends ?? [];
      setTrends(results);
      setShowTrends(results.length > 0);
      setStatus('idle');
    } catch {
      setStatus('idle');
    }
  }, [prompt, style, category]);

  const handleGenerateDesign = useCallback(async () => {
    if (prompt.trim().length < 3) return;
    setStatus('generating_design');
    setErrorMsg(null);
    setDesignImageUrl(null);
    setTryOnResultUrl(null);
    setStep('design');
    startTimer();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/studio/design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: style ?? undefined,
          category,
          trendContext: selectedTrend ? `${selectedTrend.title}: ${selectedTrend.content}` : undefined,
          designPrompt: selectedTrend?.designPrompt ?? undefined,
        }),
      });
      const data = (await res.json()) as DesignApiResponse;
      stopTimer();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (!data.designImageUrl) throw new Error('No design image returned');
      setDesignImageUrl(data.designImageUrl);
      setStatus('idle');
    } catch (err: unknown) {
      stopTimer();
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [prompt, style, category, selectedTrend]);

  const handleTryOn = useCallback(async () => {
    if (!designImageUrl || !personUrl) return;

    let publicPersonUrl = personUrl;

    if (personUrl.startsWith('data:')) {
      setStatus('uploading_photo');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const parts = personUrl.split(',');
          const mime = parts[0].split(':')[1].split(';')[0];
          const byteString = atob(parts[1]);
          const bytes = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });
          const fd = new FormData();
          fd.append('file', blob, `person_${Date.now()}.jpg`);
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: fd,
          });
          if (upRes.ok) {
            const j = (await upRes.json()) as { url?: string };
            if (j.url) publicPersonUrl = j.url;
          }
        }
      } catch {
        // keep data URL
      }
    }

    setStatus('generating_tryon');
    startTimer();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/tryon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          userId: currentUser?.id ?? 'anonymous',
          productId: `design_${Date.now()}`,
          userPhotoUrl: publicPersonUrl,
          productImageUrl: designImageUrl,
          category,
        }),
      });
      const data = (await res.json()) as TryOnApiResponse;
      stopTimer();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const url = data.result_url ?? data.resultUrl;
      if (!url) throw new Error('No try-on result returned');
      setTryOnResultUrl(url);
      setStatus('ready');
    } catch (err: unknown) {
      stopTimer();
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [designImageUrl, personUrl, category, currentUser]);

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vexa-${name}-${Date.now()}.png`;
      a.click();
    } catch { window.open(url, '_blank'); }
  };

  const reset = () => {
    setStatus('idle');
    setDesignImageUrl(null);
    setPersonUrl(null);
    setTryOnResultUrl(null);
    setErrorMsg(null);
    setStep('design');
    setPrompt('');
    setStyle('Minimalist');
    setTrends([]);
    setSelectedTrend(null);
    setShowTrends(false);
  };

  const isGeneratingDesign = status === 'generating_design';
  const isGeneratingTryon = status === 'generating_tryon' || status === 'uploading_photo';
  const isFetchingTrends = status === 'fetching_trends';
  const canGenerate = prompt.trim().length >= 3 && !isGeneratingDesign && !isFetchingTrends;

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f8f7f2] text-[#1a1a1a] selection:bg-[#4A6741]/10">
      <Header />

      <div className="px-4 md:px-6 pt-32 pb-8 max-w-7xl mx-auto w-full">
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-[#1a1a1a]">
          Design from <span className="text-[#4A6741]">Text</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg font-medium">
          Describe any garment → discover trends → AI generates it → Try it on yourself
        </p>
      </div>

      <div className="flex-1 px-4 md:px-6 pb-20 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* Left column — controls */}
          <div className="flex-1 flex flex-col gap-8">

            {/* Prompt */}
            <div className="bg-white rounded-[2rem] p-2 border border-slate-200 shadow-xl shadow-slate-200/50">
              <textarea
                rows={6}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe a garment — e.g. Anime T-shirt, silk kurta, oversized hoodie..."
                className="w-full bg-transparent border-none rounded-3xl p-6 text-lg focus:outline-none transition-all resize-none outline-none"
              />
              <div className="px-6 pb-4 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                <span>{prompt.length}/500</span>
                <span>AI Prompting Enabled</span>
              </div>
            </div>

            {/* Example prompts */}
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 hover:border-[#4A6741] hover:text-[#4A6741] transition-all whitespace-nowrap shadow-sm"
                >
                  {p.slice(0, 32)}...
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Style */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#4A6741]">Style</p>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(style === s ? null : s)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        style === s
                          ? 'bg-[#4A6741] border-[#4A6741] text-white shadow-lg shadow-[#4A6741]/20'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#4A6741]">Category</p>
                <div className="flex flex-wrap gap-2">
                  {DESIGN_CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        category === c.id
                          ? 'bg-[#4A6741] border-[#4A6741] text-white shadow-lg shadow-[#4A6741]/20'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Discover Trends button */}
            <button
              onClick={handleFetchTrends}
              disabled={prompt.trim().length < 3 || isFetchingTrends || isGeneratingDesign}
              className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all border ${
                prompt.trim().length >= 3 && !isFetchingTrends && !isGeneratingDesign
                  ? 'bg-white border-[#4A6741]/20 text-[#4A6741] hover:bg-[#4A6741]/5 shadow-sm'
                  : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              {isFetchingTrends
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching trends...</>
                : <><Sparkles className="w-4 h-4" /> Discover Trends</>}
            </button>

            {/* Trend results */}
            <AnimatePresence>
              {showTrends && trends.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-4 bg-white/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[#4A6741] text-[10px] uppercase tracking-widest font-black">
                      Trending Now — pick one to inspire your design
                    </p>
                    <button onClick={() => setShowTrends(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trends.map((trend, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedTrend(selectedTrend?.title === trend.title ? null : trend)}
                        className={`text-left px-5 py-4 rounded-2xl transition-all border ${
                          selectedTrend?.title === trend.title
                            ? 'bg-[#4A6741]/10 border-[#4A6741] text-[#1a1a1a]'
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <p className="text-sm font-black mb-1">{trend.title}</p>
                        <p className="text-xs opacity-60 line-clamp-2 leading-relaxed">{trend.content}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate button */}
            <button
              onClick={handleGenerateDesign}
              disabled={!canGenerate}
              className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
                canGenerate
                  ? 'bg-[#4A6741] text-white shadow-2xl shadow-[#4A6741]/30 hover:scale-[1.02] active:scale-95'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              {isGeneratingDesign
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating... {elapsedSec}s</>
                : selectedTrend
                  ? <>Generate with Trend <ArrowRight className="w-5 h-5" /></>
                  : <>Generate Design <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>

          {/* Right column — results */}
          <div className="lg:w-[45%] flex flex-col">
            <div className="flex-1 bg-white border border-slate-100 rounded-[3rem] shadow-2xl shadow-slate-200/50 relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">

              <AnimatePresence mode="wait">
                {/* Idle / Initial State */}
                {!designImageUrl && step === 'design' && (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex flex-col items-center gap-6 text-center p-12"
                  >
                    {isGeneratingDesign ? (
                      <div className="flex flex-col items-center gap-8">
                        <div className="relative w-40 h-40">
                          <div className="absolute inset-0 rounded-full border-4 border-slate-50" />
                          <div className="absolute inset-0 rounded-full border-4 border-t-[#4A6741] animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Shirt className="w-12 h-12 text-[#4A6741]" />
                          </div>
                        </div>
                        <div>
                          <p className="text-[#1a1a1a] text-xl font-black mb-2">Vexa AI is creating...</p>
                          <p className="text-slate-400 font-medium animate-pulse">{elapsedSec}s elapsed</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-[#4A6741]/40" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">Your design appears here</h3>
                          <p className="text-slate-400 text-sm font-medium">Then try it on yourself with one click</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* Error State */}
                {status === 'error' && (
                  <motion.div 
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-6 p-12 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-rose-500" />
                    </div>
                    <p className="text-rose-500 font-black">{errorMsg}</p>
                    <button onClick={reset} className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">
                      Try Again
                    </button>
                  </motion.div>
                )}

                {/* Design Ready State */}
                {designImageUrl && step === 'design' && (
                  <motion.div 
                    key="design-ready"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    <div className="flex-1 bg-slate-50/50 flex items-center justify-center p-8">
                      <img src={designImageUrl} alt="Generated design" className="max-h-full object-contain drop-shadow-2xl" />
                    </div>
                    <div className="p-8 bg-white/80 backdrop-blur-md border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            const params = new URLSearchParams({ garmentUrl: designImageUrl, category });
                            router.push(`/studio?${params.toString()}`);
                          }}
                          className="px-8 py-4 rounded-[1.5rem] bg-[#4A6741] text-white font-black uppercase text-sm tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#4A6741]/20"
                        >
                          Try on Yourself
                        </button>
                        <button onClick={() => handleDownload(designImageUrl, 'design')} className="p-4 rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                      <button onClick={reset} className="text-slate-400 text-xs font-black uppercase tracking-widest hover:text-[#1a1a1a] transition-all flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" /> Start Over
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Shirt = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5V12m0 0l3.75-3.75M12 12L8.25 8.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5a3.375 3.375 0 100 6.75 3.375 3.375 0 000-6.75z" />
  </svg>
);
