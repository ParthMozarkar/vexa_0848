'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Download,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Lock,
  Shirt,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';

function proxyIfExternal(url: string): string {
  if (!url || !url.startsWith('http')) return url;
  try {
    const u = new URL(url);
    const isSupabase = u.hostname.endsWith('.supabase.co');
    const isR2 = u.hostname.endsWith('.r2.dev') || u.hostname.endsWith('.r2.cloudflarestorage.com');
    const isSameOrigin = typeof window !== 'undefined' && u.hostname === window.location.hostname;
    if (isSupabase || isR2 || isSameOrigin) return url;
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

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
  limitReached?: boolean;
}

interface TrendsApiResponse {
  trends?: TrendResult[];
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

export default function DesignPage() {
  const { currentUser, setPendingGarmentUrl } = useStore();
  const router = useRouter();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string | null>('Minimalist');
  const [category, setCategory] = useState('tops');
  const [step, setStep] = useState<DesignStep>('design');
  const [status, setStatus] = useState<DesignStatus>('idle');
  const [designImageUrl, setDesignImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setLimitReached(false);
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
          userId: currentUser?.id ?? 'anonymous',
        }),
      });

      const data = (await res.json()) as DesignApiResponse;
      stopTimer();

      if (res.status === 429 && data.limitReached) {
        setLimitReached(true);
        setStatus('idle');
        return;
      }

      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (!data.designImageUrl) throw new Error('No design image returned');
      setDesignImageUrl(data.designImageUrl);
      setStatus('idle');
    } catch (err: unknown) {
      stopTimer();
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [prompt, style, category, selectedTrend, currentUser]);

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
    setErrorMsg(null);
    setStep('design');
    setLimitReached(false);
  };

  const canGenerate = prompt.trim().length >= 3 && status === 'idle' && !limitReached;
  const canFetchTrends = prompt.trim().length >= 3 && status !== 'fetching_trends' && !limitReached;

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f8f7f2] text-[#1a1a1a]">
      <Header />

      <div className="px-4 md:px-6 pt-32 pb-8 max-w-7xl mx-auto w-full">
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-[#1a1a1a]">
          Design from <span className="text-[#4A6741]">Text</span>
        </h1>
        <p className="text-slate-500 mt-2 text-lg font-medium">
          AI generates high-quality 2K garment designs from your description.
        </p>
      </div>

      <div className="flex-1 px-4 md:px-6 pb-20 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-12">

          <div className="flex-1 flex flex-col gap-8">
            <div className="bg-white rounded-[2rem] p-2 border border-slate-200 shadow-xl">
              <textarea
                rows={6}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                disabled={limitReached}
                placeholder="Describe a garment — e.g. Silk kurta, oversized hoodie..."
                className="w-full bg-transparent border-none rounded-3xl p-6 text-lg focus:outline-none resize-none outline-none"
              />
            </div>

            {/* Style + Category selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Style</span>
              {STYLES.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(prev => (prev === s ? null : s))}
                  disabled={limitReached}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    style === s
                      ? 'bg-[#4A6741] text-white border border-[#4A6741]'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-[#4A6741] hover:text-[#4A6741]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Category</span>
              {DESIGN_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  disabled={limitReached}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    category === c.id
                      ? 'bg-[#4A6741] text-white border border-[#4A6741]'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-[#4A6741] hover:text-[#4A6741]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Get Trends button — fetches Anakin → GPT-4o-mini trend cards */}
            <button
              onClick={handleFetchTrends}
              disabled={!canFetchTrends}
              className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 border transition-all ${
                canFetchTrends
                  ? 'bg-white text-[#4A6741] border-[#4A6741] hover:bg-[#4A6741] hover:text-white'
                  : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
              }`}
            >
              {status === 'fetching_trends' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Fetching live trends...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Get Live Trend Suggestions</>
              )}
            </button>

            {/* Trend chips — populated from /api/studio/trends */}
            {showTrends && trends.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {trends.length} Live Trends
                  </span>
                  {selectedTrend && (
                    <button
                      onClick={() => setSelectedTrend(null)}
                      className="text-xs font-bold text-slate-400 hover:text-[#4A6741]"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {trends.map((trend, i) => {
                    const isSelected = selectedTrend?.title === trend.title;
                    return (
                      <button
                        key={`${trend.title}-${i}`}
                        onClick={() => {
                          setSelectedTrend(isSelected ? null : trend);
                          if (!isSelected) setPrompt(trend.designPrompt || trend.title);
                        }}
                        title={trend.content}
                        className={`px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-[#4A6741] text-white border-[#4A6741]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#4A6741] hover:text-[#4A6741]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {trend.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Static example fallbacks */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Or pick an example
              </span>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => setPrompt(p)}
                    disabled={limitReached}
                    className="px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 hover:border-[#4A6741] hover:text-[#4A6741]"
                  >
                    {p.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateDesign}
              disabled={!canGenerate}
              className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
                canGenerate
                  ? 'bg-[#4A6741] text-white shadow-2xl hover:scale-[1.02]'
                  : limitReached ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-300'
              }`}
            >
              {status === 'generating_design' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating... {elapsedSec}s</>
              ) : limitReached ? (
                <><Lock className="w-5 h-5" /> Free Limit Reached</>
              ) : (
                <>Generate Design <ArrowRight className="w-5 h-5" /></>
              )}
            </button>

            {limitReached && (
              <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                Trial over (3 designs). Resets automatically in 24 hours.
              </p>
            )}
          </div>

          <div className="lg:w-[45%] flex flex-col">
            <div className="flex-1 bg-white border border-slate-100 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
              <AnimatePresence mode="wait">
                {limitReached ? (
                  <motion.div key="limit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6 p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
                      <Lock className="w-10 h-10 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black mb-2">Free Trial Finished</h3>
                      <p className="text-slate-500 font-medium">You&apos;ve used all 3 free designs for today. Your limit resets in 24 hours.</p>
                    </div>
                  </motion.div>
                ) : status === 'error' ? (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6 p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-rose-500" />
                    <p className="text-rose-500 font-black">{errorMsg}</p>
                    <button onClick={reset} className="px-8 py-4 rounded-2xl bg-slate-100 font-bold">Try Again</button>
                  </motion.div>
                ) : designImageUrl ? (
                  <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col">
                    <div className="flex-1 bg-slate-50 flex items-center justify-center p-8">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proxyIfExternal(designImageUrl)} alt="Design" className="max-h-full object-contain" />
                    </div>
                    <div className="p-8 bg-white border-t flex justify-between items-center">
                      <button
                        onClick={() => {
                          setPendingGarmentUrl(designImageUrl);
                          router.push(`/studio?fromDesign=1&category=${encodeURIComponent(category)}`);
                        }}
                        className="px-8 py-4 rounded-2xl bg-[#4A6741] text-white font-black uppercase text-xs"
                      >
                        Try on Yourself
                      </button>
                      <button onClick={() => handleDownload(designImageUrl, 'design')} className="p-4 rounded-2xl bg-slate-50"><Download className="w-5 h-5" /></button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="idle" className="flex flex-col items-center gap-6 text-center p-12">
                    <Shirt className="w-12 h-12 text-slate-200" />
                    <p className="text-slate-400 font-medium">Your 2K design will appear here</p>
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
