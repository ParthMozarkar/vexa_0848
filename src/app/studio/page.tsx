"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, RotateCcw, Shirt } from "lucide-react";
import { ImageUploadBox } from "@/components/studio/ImageUploadBox";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import Header from "@/components/Header";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "tops" | "bottoms" | "one-pieces";
type TryOnStatus = "idle" | "loading" | "ready" | "error";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "tops", label: "Tops" },
  { id: "bottoms", label: "Bottoms" },
  { id: "one-pieces", label: "One-Pieces" },
];

interface TryOnApiResponse {
  result_url?: string;
  resultUrl?: string;
  error?: string;
  status?: string;
  cached?: boolean;
}

// ── Studio Page ───────────────────────────────────────────────────────────────

export default function StudioPage() {
  const { currentUser } = useStore();

  const [personUrl, setPersonUrl] = useState<string | null>(null);
  const [garmentUrl, setGarmentUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("tops");
  const [status, setStatus] = useState<TryOnStatus>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [personUploading, setPersonUploading] = useState(false);
  const [garmentUploading, setGarmentUploading] = useState(false);
  const isUploading = personUploading || garmentUploading;

  const canGenerate = !!personUrl && !!garmentUrl && !isUploading && status !== "loading";

  const handleGenerate = async () => {
    if (!personUrl || !garmentUrl) {
      setErrorMsg("Please upload both images first.");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    setResultUrl(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body = {
        userId: currentUser?.id ?? "anonymous",
        productId: `custom_${Date.now()}`,
        userPhotoUrl: personUrl,
        productImageUrl: garmentUrl,
        category,
      };

      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as TryOnApiResponse;
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      const url = data.result_url ?? data.resultUrl;
      if (!url) throw new Error("No result URL returned from the AI engine.");

      setResultUrl(url);
      setStatus("ready");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setResultUrl(null);
    setErrorMsg(null);
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
      onClick: handleGenerate
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
          Upload your photo and a garment to generate your AI look.
        </p>
      </div>

      <div className="flex-1 px-4 md:px-6 pb-20 max-w-7xl mx-auto w-full">
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
                  {status === "idle" && (
                    <motion.div key="idle" className="flex flex-col items-center gap-4 text-center p-8">
                      <Shirt className="w-8 h-8 text-slate-200" />
                      <p className="text-slate-400 font-medium text-sm">Waiting for uploads...</p>
                    </motion.div>
                  )}
                  {status === "loading" && (
                    <motion.div key="loading" className="flex flex-col items-center gap-6 text-center p-8">
                      <Loader2 className="w-12 h-12 text-[#4A6741] animate-spin" />
                      <p className="text-[#0f172a] text-lg font-black">AI is processing...</p>
                    </motion.div>
                  )}
                  {status === "ready" && resultUrl && (
                    <motion.div key="result" className="absolute inset-0">
                      <img src={resultUrl} alt="Result" className="w-full h-full object-contain" />
                      <button onClick={handleDownload} className="absolute bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0f172a] text-white font-bold text-sm shadow-xl">
                        <Download className="w-4 h-4" /> Download
                      </button>
                    </motion.div>
                  )}
                  {status === "error" && (
                    <motion.div key="error" className="flex flex-col items-center gap-4 text-center p-8">
                      <RotateCcw className="w-6 h-6 text-rose-400" />
                      <p className="text-rose-500 font-bold text-sm">{errorMsg}</p>
                      <button onClick={handleReset} className="px-6 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs">Try Again</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right: 30% */}
          <div className="w-full lg:w-[30%] flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">02. Garment</p>
              <ImageUploadBox
                label="Garment"
                sublabel="Flat-lay photo"
                value={garmentUrl}
                onChange={setGarmentUrl}
                onClear={() => { setGarmentUrl(null); setGarmentUploading(false); }}
                onUploadingChange={setGarmentUploading}
                height="h-64 lg:h-[300px]"
              />
              <div className="mt-6 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</p>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button key={cat.id} onClick={() => setCategory(cat.id)} className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${category === cat.id ? "bg-[#4A6741] text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-200"}`}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">{statusText()}</p>
          <button disabled={btn.disabled} onClick={btn.onClick} className={`px-12 py-4 rounded-2xl text-base font-black uppercase tracking-widest transition-all shadow-2xl text-white ${btn.className}`}>
            {btn.label}
          </button>
        </div>
      </div>
    </div>
  );
}
