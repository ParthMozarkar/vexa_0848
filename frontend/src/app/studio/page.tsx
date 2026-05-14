"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, RotateCcw, Shirt, Lock, Film } from "lucide-react";
import { ImageUploadBox } from "@/components/studio/ImageUploadBox";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import Header from "@/components/Header";
import { SizeCompass } from "@/components/studio/SizeCompass";
import { createOutfitCollage } from "@/lib/studio/collage";

// ── Types ─────────────────────────────────────────────────────────────────────

type TryOnCategory =
  | "tops" | "bottoms" | "one-pieces"
  | "shoes" | "bags" | "jewelry";

type TryOnStatus = "idle" | "loading" | "ready" | "error";
type StudioTab = "tryon" | "model-gen";

const CLOTHING_CATEGORIES: { id: TryOnCategory; label: string; icon: string }[] = [
  { id: "tops",       label: "Tops",    icon: "👕" },
  { id: "bottoms",    label: "Bottoms", icon: "👖" },
  { id: "one-pieces", label: "Dresses", icon: "👗" },
];

const ACCESSORY_CATEGORIES: { id: TryOnCategory; label: string; icon: string }[] = [
  { id: "shoes",  label: "Shoes",   icon: "👟" },
  { id: "bags",   label: "Bags",    icon: "👜" },
  { id: "jewelry",label: "Jewelry", icon: "💍" },
];

interface GarmentItem {
  id: string;
  url: string;
  category: TryOnCategory;
}

interface TryOnApiResponse {
  result_url?: string;
  resultUrl?: string;
  error?: string;
  status?: string;
  cached?: boolean;
  limitReached?: boolean;
  generationsRemaining?: number | null;
  message?: string;
}

const FETCH_TIMEOUT_MS = 300_000;

// ── Studio Page ───────────────────────────────────────────────────────────────

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

function StudioPageInner() {
  const { currentUser } = useStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<StudioTab>("tryon");
  const [personUrl, setPersonUrl] = useState<string | null>(null);

  // Multi-item state
  const [garments, setGarments] = useState<GarmentItem[]>([]);
  
  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tempGarmentUrl, setTempGarmentUrl] = useState<string | null>(null);
  const [tempCategory, setTempCategory] = useState<TryOnCategory>("tops");
  const [isTempUploading, setIsTempUploading] = useState(false);

  const [status, setStatus] = useState<TryOnStatus>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [generationsRemaining, setGenerationsRemaining] = useState<number | null>(null);

  // New Features State
  const [selectedVibe, setSelectedVibe] = useState<string>("Studio White");
  const [isSavedToCloset, setIsSavedToCloset] = useState(false);
  const [isSharedToSocial, setIsSharedToSocial] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [personUploading, setPersonUploading] = useState(false);
  const isUploading = personUploading || isTempUploading;

  const canGenerate = !!personUrl && garments.length > 0 && !isUploading && status !== "loading";

  useEffect(() => {
    if (status === "loading") {
      setElapsedSec(0);
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // Pre-fill garment from /design page redirect
  useEffect(() => {
    const garmentUrl = searchParams.get('garmentUrl');
    const cat = (searchParams.get('category') ?? 'tops') as TryOnCategory;
    if (garmentUrl) {
      setGarments([{ id: `design_${Date.now()}`, url: garmentUrl, category: cat }]);
      setActiveTab('tryon');
    }
  }, [searchParams]);

  const handleAddGarment = () => {
    if (tempGarmentUrl) {
      setGarments([...garments, { id: `item_${Date.now()}`, url: tempGarmentUrl, category: tempCategory }]);
      setIsAddModalOpen(false);
      setTempGarmentUrl(null);
      setTempCategory("tops");
    }
  };

  const handleRemoveGarment = (id: string) => {
    setGarments(garments.filter(g => g.id !== id));
  };

  // createOutfitCollage moved to @/lib/studio/collage

  const handleGenerate = useCallback(async () => {
    if (!personUrl || garments.length === 0) {
      setErrorMsg("Please upload a person photo and at least one item.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    setStatus("loading");
    setErrorMsg(null);
    setResultUrl(null);
    setIsSavedToCloset(false);
    setIsSharedToSocial(false);
    setLimitReached(false);

    try {
      // SMART COMPOSITION: If multiple items, merge them into 1 image to make the API 4x faster
      const finalGarments = garments.length > 1 
        ? [{ url: await createOutfitCollage(garments), category: "one-pieces" as TryOnCategory }]
        : [{ url: garments[0].url, category: garments[0].category }];

      const { data: { session } } = await supabase.auth.getSession();
      const body = {
        userId: currentUser?.id ?? "anonymous",
        productId: `custom_${Date.now()}`,
        userPhotoUrl: personUrl,
        garments: finalGarments,
        backgroundVibe: selectedVibe, // Pass the vibe context to the AI
      };

      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await res.text();
      let data: TryOnApiResponse;
      try {
        data = JSON.parse(rawText) as TryOnApiResponse;
      } catch {
        if (res.status === 504 || rawText.includes("<!DOCTYPE")) {
          throw new Error("The AI engine timed out. Please try again.");
        }
        throw new Error(`Server error (${res.status}). Please try again.`);
      }

      if (res.status === 429 && data.limitReached) {
        setLimitReached(true);
        setStatus("idle");
        clearTimeout(timeoutId);
        return;
      }

      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      const url = data.result_url ?? data.resultUrl;
      if (!url) throw new Error("No result URL returned from the AI engine.");

      if (typeof data.generationsRemaining === 'number') {
        setGenerationsRemaining(data.generationsRemaining);
      }

      setResultUrl(url);
      setStatus("ready");
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        setErrorMsg("Request timed out. Please try again.");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      }
      setStatus("error");
    }
  }, [personUrl, garments, currentUser]);

  const handleReset = () => {
    setStatus("idle");
    setResultUrl(null);
    setErrorMsg(null);
    setLimitReached(false);
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `vexa-tryon-${Date.now()}.png`;
      a.click();
    } catch { window.open(resultUrl, "_blank"); }
  };

  const statusText = (): string => {
    if (isUploading) return "⏳ Uploading images…";
    if (status === "loading") return "⚡ Processing with Vexa AI...";
    if (status === "ready") return "✅ Try-on complete";
    if (status === "error") return `❌ ${errorMsg}`;
    return "";
  };

  const buttonConfig = () => {
    if (status === "loading") return { label: "Generating...", className: "bg-[#4A6741]/50 cursor-not-allowed", disabled: true, onClick: () => {} };
    if (status === "ready") return { label: "Try Again →", className: "bg-[#4A6741] hover:bg-[#3d5636]", disabled: false, onClick: handleReset };
    return {
      label: "Generate Try-On →",
      className: canGenerate ? "bg-[#4A6741] hover:bg-[#3d5636]" : "bg-slate-100 text-slate-300 cursor-not-allowed",
      disabled: !canGenerate,
      onClick: handleGenerate,
    };
  };

  const btn = buttonConfig();

  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-50/20">
      <Header />

      <div className="px-4 md:px-6 pt-24 pb-8 max-w-7xl mx-auto w-full text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#1a1a1a]">
          Virtual Try-On <span className="text-[#4A6741]">Studio</span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">
          Upload your photo and items to generate your AI look.
        </p>
      </div>

      <div className="flex-1 px-4 md:px-6 pb-20 max-w-7xl mx-auto w-full">

        {/* Tab switcher removed as only one tab remains */}

        {/* Try-On Tab */}
        {activeTab === "tryon" && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* Left: 30% */}
            <div className="w-full lg:w-[30%] flex flex-col gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">01. Your Photo</p>
                <ImageUploadBox
                  label="Person"
                  sublabel="Full body photo"
                  value={personUrl}
                  onChange={setPersonUrl}
                  onClear={() => { setPersonUrl(null); setPersonUploading(false); }}
                  onUploadingChange={setPersonUploading}
                  height="h-64 lg:h-[400px]"
                />
                <SizeCompass personUrl={personUrl} />
              </div>
            </div>

            {/* Center: 40% */}
            <div className="w-full lg:w-[40%] flex flex-col">
              <div className="bg-white p-6 flex flex-col min-h-[500px] lg:h-[580px] border border-slate-100 shadow-2xl shadow-slate-200/50 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[#4A6741] text-[10px] font-black uppercase tracking-widest">Generation Stage</p>
                </div>

                <div className="flex-1 relative rounded-3xl overflow-hidden flex items-center justify-center bg-slate-50/50 border border-slate-100">
                  <AnimatePresence mode="wait">
                    {limitReached && (
                      <motion.div
                        key="limit"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-4 text-center p-8 w-full"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-[#4A6741]/10 flex items-center justify-center">
                          <Lock className="w-7 h-7 text-[#4A6741]" />
                        </div>
                        <div>
                          <p className="text-[#1a1a1a] font-black text-base">You&apos;ve used your 2 free try-ons</p>
                          <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
                            VEXA is built for fashion marketplaces like Myntra and Snitch. Your free trial has ended.
                          </p>
                        </div>
                        <a
                          href="https://vexatryon.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#4A6741] text-white font-bold text-sm hover:bg-[#3d5636] transition-all shadow-lg"
                        >
                          Learn about VEXA for Marketplaces →
                        </a>
                      </motion.div>
                    )}
                    {!limitReached && status === "idle" && (
                      <motion.div key="idle" className="flex flex-col items-center gap-4 text-center p-8">
                        <Shirt className="w-8 h-8 text-slate-200" />
                        <p className="text-slate-400 font-medium text-sm">Waiting for uploads...</p>
                      </motion.div>
                    )}
                    {!limitReached && status === "loading" && (
                      <motion.div key="loading" className="flex flex-col items-center gap-6 text-center p-8 w-full">
                        <div className="relative">
                          <Loader2 className="w-16 h-16 text-[#4A6741] animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-black text-[#4A6741]">{Math.min(99, Math.floor((elapsedSec / 55) * 100))}%</span>
                          </div>
                        </div>
                        <div className="space-y-2 w-full max-w-[240px]">
                          <p className="text-[#0f172a] text-lg font-black">AI is processing...</p>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-[#4A6741]"
                              initial={{ width: "0%" }}
                              animate={{ width: `${Math.min(99, (elapsedSec / 55) * 100)}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            {elapsedSec}s elapsed — {
                              elapsedSec < 8 ? "Initializing..." :
                              elapsedSec < 20 ? "Optimizing textures..." :
                              elapsedSec < 40 ? "Rendering diffusion..." :
                              "Perfecting details..."
                            }
                          </p>
                        </div>
                      </motion.div>
                    )}
                    {!limitReached && status === "ready" && resultUrl && (
                      <motion.div key="result" className="absolute inset-0">
                        <img src={proxyIfExternal(resultUrl)} alt="Result" className="w-full h-full object-contain" />
                      </motion.div>
                    )}
                    {!limitReached && status === "error" && (
                      <motion.div key="error" className="flex flex-col items-center gap-4 text-center p-8">
                        <RotateCcw className="w-6 h-6 text-rose-400" />
                        <p className="text-rose-500 font-bold text-sm">{errorMsg}</p>
                        <button onClick={handleReset} className="px-6 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs">Try Again</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action Buttons BELOW image */}
                {status === "ready" && resultUrl && (
                  <div className="mt-6 flex flex-wrap justify-center gap-3 z-10">
                    <button 
                      onClick={() => window.open("https://www.instagram.com", "_blank")} 
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs bg-white text-[#4A6741] border border-slate-200 shadow-xl hover:bg-slate-50 hover:scale-105 transition-all"
                    >
                      Export to Instagram
                    </button>

                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = resultUrl;
                        link.download = `vexa_tryon_${Date.now()}.png`;
                        link.click();
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#0f172a] text-white font-bold text-xs hover:bg-black transition-all shadow-xl hover:scale-105"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>

                    <button
                      onClick={() => router.push(`/video-tryon?image=${encodeURIComponent(resultUrl)}`)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3d5636] transition-all shadow-xl hover:scale-105"
                    >
                      <Film className="w-3.5 h-3.5" />
                      Try Video Try-On
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: 30% */}
            <div className="w-full lg:w-[30%] flex flex-col gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">02. Garments & Accessories</p>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="text-[#4A6741] text-[10px] font-bold uppercase tracking-widest hover:underline"
                  >
                    + Add Item
                  </button>
                </div>
                
                <div className="space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto pr-2">
                  {garments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-2xl">
                      <p className="text-slate-400 text-sm font-medium">No items added yet</p>
                      <button onClick={() => setIsAddModalOpen(true)} className="mt-2 text-[#4A6741] text-xs font-bold bg-[#4A6741]/10 px-3 py-1.5 rounded-full hover:bg-[#4A6741]/20 transition-all">
                        Add an Item
                      </button>
                    </div>
                  ) : (
                    garments.map((g, idx) => (
                      <div key={g.id} className="relative group bg-slate-50 border border-slate-100 rounded-2xl p-2 flex items-center gap-4 shadow-sm">
                        <img src={g.url} alt="Item" className="w-16 h-16 object-cover rounded-xl" />
                        <div>
                          <p className="text-xs font-bold text-slate-700 capitalize">Item {idx + 1}</p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">Type: {g.category.replace("-", " ")}</p>
                        </div>
                        <button 
                          onClick={() => handleRemoveGarment(g.id)}
                          className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Model Generator Tab removed */}
      </div>

      {/* Sticky bottom bar — only visible on try-on tab */}
      {activeTab === "tryon" && (
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-400">{statusText()}</p>
              {!limitReached && generationsRemaining !== null && (
                <p className="text-xs font-medium text-slate-400">
                  {generationsRemaining === 1 ? '1 free try-on remaining' : `${generationsRemaining} free try-ons remaining`}
                </p>
              )}
              {!limitReached && generationsRemaining === null && status === "idle" && (
                <p className="text-xs font-medium text-slate-400">2 free try-ons available</p>
              )}
            </div>
            <button
              disabled={btn.disabled || limitReached}
              onClick={btn.onClick}
              className={`px-12 py-4 rounded-2xl text-base font-black uppercase tracking-widest transition-all shadow-2xl text-white ${limitReached ? "bg-slate-200 text-slate-400 cursor-not-allowed" : btn.className}`}
            >
              {btn.label}
            </button>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-[#1a1a1a]">Add New Item</h3>
                <button onClick={() => { setIsAddModalOpen(false); setTempGarmentUrl(null); }} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <ImageUploadBox
                label="Upload Image"
                sublabel="Garment or accessory photo"
                value={tempGarmentUrl}
                onChange={setTempGarmentUrl}
                onClear={() => { setTempGarmentUrl(null); setIsTempUploading(false); }}
                onUploadingChange={setIsTempUploading}
                height="h-48"
              />

              <div className="space-y-3">
                {/* Clothing */}
                <div>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-2">Clothing</p>
                  <div className="flex gap-2 flex-wrap">
                    {CLOTHING_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setTempCategory(c.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                          tempCategory === c.id
                            ? "bg-[#4A6741] text-white shadow-lg"
                            : "bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-700"
                        }`}
                      >
                        <span className="text-xs">{c.icon}</span> {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accessories */}
                <div>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    Accessories <span className="text-[8px] bg-[#4A6741] text-white px-1.5 py-0.5 rounded font-bold">NEW</span>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {ACCESSORY_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setTempCategory(c.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                          tempCategory === c.id
                            ? "bg-[#4A6741] text-white shadow-lg"
                            : "bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-700"
                        }`}
                      >
                        <span className="text-xs">{c.icon}</span> {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                disabled={!tempGarmentUrl || isTempUploading}
                onClick={handleAddGarment}
                className="w-full py-4 mt-2 rounded-2xl bg-[#4A6741] text-white font-black uppercase tracking-widest text-sm hover:bg-[#3d5636] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm & Add
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioPageInner />
    </Suspense>
  );
}
