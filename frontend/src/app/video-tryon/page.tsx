'use client';

import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, Download, Film, Sparkles } from 'lucide-react';
import { ImageUploadBox } from '@/components/studio/ImageUploadBox';
import { VideoTryOn } from '@/components/VideoTryOn';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import type { Outfit } from '@/types';

type VideoGenStatus = 'idle' | 'generating' | 'ready' | 'error';

interface VideoGenResponse {
  videoUrl?: string;
  frameUrls?: string[];
  type?: 'video' | 'frames';
  error?: string;
}

function VideoTryOnPageInner() {
  const searchParams = useSearchParams();
  // ── Animate section ────────────────────────────────────────────────────────
  const [animateImageUrl, setAnimateImageUrl] = useState<string | null>(null);

  // Preload image from ?image=<url> query param (handoff from /studio)
  useEffect(() => {
    const imgParam = searchParams?.get('image');
    if (imgParam) {
      try {
        setAnimateImageUrl(decodeURIComponent(imgParam));
      } catch {
        setAnimateImageUrl(imgParam);
      }
    }
  }, [searchParams]);
  const [animateStatus, setAnimateStatus] = useState<VideoGenStatus>('idle');
  const [animateResultUrl, setAnimateResultUrl] = useState<string | null>(null);
  const [animateError, setAnimateError] = useState<string | null>(null);
  const [animateElapsed, setAnimateElapsed] = useState(0);

  // ── Video try-on section ───────────────────────────────────────────────────
  const [garmentUrl, setGarmentUrl] = useState<string | null>(null);

  const animateTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setAnimateElapsed(0);
    animateTimerRef.current = setInterval(() => setAnimateElapsed(s => s + 1), 1000);
  };
  const stopTimer = () => {
    if (animateTimerRef.current) { clearInterval(animateTimerRef.current); animateTimerRef.current = null; }
  };

  const handleAnimate = useCallback(async () => {
    if (!animateImageUrl) return;

    let publicUrl = animateImageUrl;

    if (animateImageUrl.startsWith('data:')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const parts = animateImageUrl.split(',');
          const mime = parts[0].split(':')[1].split(';')[0];
          const byteString = atob(parts[1]);
          const bytes = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });
          const fd = new FormData();
          fd.append('file', blob, `animate_${Date.now()}.jpg`);
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: fd,
          });
          if (upRes.ok) {
            const j = (await upRes.json()) as { url?: string };
            if (j.url) publicUrl = j.url;
          }
        }
      } catch {
        // keep data URL
      }
    }

    setAnimateStatus('generating');
    setAnimateError(null);
    setAnimateResultUrl(null);
    startTimer();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/studio/video-gen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ imageUrl: publicUrl, duration: '5' }),
      });

      const data = (await res.json()) as VideoGenResponse;
      stopTimer();

      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (!data.videoUrl) throw new Error('No video URL returned');

      setAnimateResultUrl(data.videoUrl);
      setAnimateStatus('ready');
    } catch (err: unknown) {
      stopTimer();
      setAnimateError(err instanceof Error ? err.message : String(err));
      setAnimateStatus('error');
    }
  }, [animateImageUrl]);

  const mockProduct: Outfit = {
    id: `video_${Date.now()}`,
    name: 'Video Try-On',
    imageUrl: garmentUrl ?? '',
    price: 0,
    category: 'tops' as const,
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f8f7f2]">
      <Header />

      <div className="px-6 pt-32 pb-12 max-w-7xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] text-[10px] font-black uppercase tracking-widest mb-4">
          <Sparkles className="w-3 h-3" />
          Beta Experience
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-[#1a1a1a]">
          Video <span className="text-gradient-primary">Try-On</span>
        </h1>
        <p className="text-slate-500 mt-4 text-base md:text-lg max-w-2xl leading-relaxed">
          Animate your try-on result or upload a video for garment try-on. 
          The next evolution of digital fashion experience.
        </p>
      </div>

      <div className="flex-1 px-6 pb-24 max-w-7xl mx-auto w-full flex flex-col gap-16">

        {/* Section 1 — Animate Your Try-On */}
        <section className="relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-[#1a1a1a] text-2xl font-black tracking-tight mb-2">Animate Your Try-On</h2>
              <p className="text-slate-500 text-sm">Upload a try-on result image → AI creates a short fashion video.</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left inputs */}
            <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-6">
              <div className="glass-card rounded-[2rem] p-6 border-slate-200/60 bg-white/50 shadow-xl shadow-slate-200/20">
                <ImageUploadBox
                  label="Try-on result image"
                  sublabel="Upload your generated photo"
                  value={animateImageUrl}
                  onChange={setAnimateImageUrl}
                  onClear={() => { setAnimateImageUrl(null); setAnimateStatus('idle'); }}
                  height="h-72"
                />
                <button
                  onClick={handleAnimate}
                  disabled={!animateImageUrl || animateStatus === 'generating'}
                  className={`w-full mt-6 py-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${
                    animateImageUrl && animateStatus !== 'generating'
                      ? 'bg-[#4A6741] text-white hover:bg-[#3d5636] shadow-xl shadow-[#4A6741]/20'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {animateStatus === 'generating'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Animating... {animateElapsed}s</>
                    : <><Film className="w-4 h-4" /> Generate Video</>}
                </button>
              </div>
            </div>

            {/* Right result */}
            <div className="flex-1 min-h-[400px] rounded-[2.5rem] border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/20 overflow-hidden flex items-center justify-center relative">
              {animateStatus === 'idle' && (
                <div className="flex flex-col items-center gap-4 text-center p-12">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <Film className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[#1a1a1a] font-bold">No video generated yet</p>
                    <p className="text-slate-400 text-sm mt-1">Upload an image to start the animation process</p>
                  </div>
                </div>
              )}
              {animateStatus === 'generating' && (
                <div className="flex flex-col items-center gap-6 p-12 text-center">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-[#4A6741] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-[#4A6741]/40" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[#1a1a1a] font-black text-xl">Generating Video... {animateElapsed}s</p>
                    <p className="text-slate-400 text-sm mt-2">Our AI is mapping fabric physics and motion.<br/>This usually takes 60-90 seconds.</p>
                  </div>
                </div>
              )}
              {animateStatus === 'ready' && animateResultUrl && (
                <div className="w-full h-full flex flex-col">
                  <video src={animateResultUrl} controls className="w-full h-full object-cover" />
                  <div className="absolute bottom-6 right-6">
                    <a
                      href={animateResultUrl}
                      download={`vexa-video-${Date.now()}.mp4`}
                      className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl text-[#1a1a1a] text-sm font-bold shadow-2xl border border-white hover:bg-white transition-all"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  </div>
                </div>
              )}
              {animateStatus === 'error' && (
                <div className="flex flex-col items-center gap-4 text-center p-12">
                  <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-500">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-rose-500 font-bold">Animation failed</p>
                    <p className="text-slate-400 text-sm mt-1">{animateError}</p>
                  </div>
                  <button onClick={() => setAnimateStatus('idle')} className="mt-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-all">Try Again</button>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="h-px bg-slate-200/60 w-full" />

        {/* Section 2 — Video Try-On */}
        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-[#1a1a1a] text-2xl font-black tracking-tight mb-2">Garment Swap</h2>
              <p className="text-slate-500 text-sm">Upload a garment and record/upload a short video to try it on.</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-[380px] flex-shrink-0">
              <div className="glass-card rounded-[2rem] p-6 border-slate-200/60 bg-white/50 shadow-xl shadow-slate-200/20">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black mb-4">Target Garment</p>
                <ImageUploadBox
                  label="Garment Image"
                  sublabel="Flat-lay product photo"
                  value={garmentUrl}
                  onChange={setGarmentUrl}
                  onClear={() => setGarmentUrl(null)}
                  height="h-72"
                />
              </div>
            </div>

            <div className="flex-1">
              {garmentUrl ? (
                <div className="glass-card rounded-[2.5rem] border-slate-200/60 bg-white shadow-2xl shadow-slate-200/20 overflow-hidden">
                  <VideoTryOn product={mockProduct} />
                </div>
              ) : (
                <div className="min-h-[400px] rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/30 flex items-center justify-center text-center p-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center text-slate-200 shadow-sm">
                      <Film className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[#1a1a1a] font-bold">Ready to try on</p>
                      <p className="text-slate-400 text-sm mt-1">Upload a garment photo on the left to activate the video studio</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function VideoTryOnPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-[#f8f7f2]" />}>
      <VideoTryOnPageInner />
    </Suspense>
  );
}
