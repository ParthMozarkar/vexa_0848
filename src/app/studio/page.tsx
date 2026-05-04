"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, RotateCcw, Shirt } from "lucide-react";
import { ImageUploadBox } from "@/components/studio/ImageUploadBox";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";

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

  // Track whether either image is still uploading to a server
  const [personUploading, setPersonUploading] = useState(false);
  const [garmentUploading, setGarmentUploading] = useState(false);
  const isUploading = personUploading || garmentUploading;

  const canGenerate =
    !!personUrl && !!garmentUrl && !isUploading && status !== "loading";

  const handleGenerate = async () => {
    if (!personUrl || !garmentUrl) {
      setErrorMsg("Please upload both images first.");
      return;
    }
    if (isUploading) {
      setErrorMsg("Please wait — images are still uploading.");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);
    setResultUrl(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const body = {
        userId: currentUser?.id ?? "anonymous",
        productId: `custom_${Date.now()}`,
        userPhotoUrl: personUrl,
        productImageUrl: garmentUrl,
        category,
      };

      // 270-second client-side timeout — matches server maxDuration minus buffer
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 270_000);

      let res: Response;
      try {
        res = await fetch("/api/tryon", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = (await res.json()) as TryOnApiResponse;

      if (!res.ok) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      const url = data.result_url ?? data.resultUrl;
      if (!url) throw new Error("No result URL returned from the AI engine.");

      setResultUrl(url);
      setStatus("ready");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      const isAbort =
        err instanceof DOMException && err.name === "AbortError";
      const friendly = isAbort
        ? "Request timed out. The AI engine may be busy — please try again."
        : message.toLowerCase().includes("rate limit") || message.includes("429")
        ? "Vexa AI is busy right now. Please try again in 2 minutes."
        : message;
      setErrorMsg(friendly);
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
    } catch {
      window.open(resultUrl, "_blank");
    }
  };

  // ── Status bar text ──────────────────────────────────────────────────────────
  const statusText = (): string => {
    if (isUploading) return "⏳ Uploading images…";
    switch (status) {
      case "loading":
        return "⚡ Processing with Vexa AI · may take up to 2 min";
      case "ready":
        return "✅ Try-on complete";
      case "error":
        return `❌ ${errorMsg ?? "An error occurred"}`;
      default:
        return "";
    }
  };

  // ── Button config ────────────────────────────────────────────────────────────
  interface ButtonConfig {
    label: string;
    className: string;
    disabled: boolean;
    onClick: () => void;
  }

  const buttonConfig = (): ButtonConfig => {
    if (status === "loading") {
      return {
        label: "Generating…",
        className: "bg-[#4A6741]/50 text-white/50 cursor-not-allowed",
        disabled: true,
        onClick: () => {},
      };
    }
    if (status === "ready") {
      return {
        label: "Try Again →",
        className:
          "bg-[#4A6741] text-white hover:bg-[#3d5636] cursor-pointer shadow-lg shadow-[#4A6741]/20",
        disabled: false,
        onClick: handleReset,
      };
    }
    if (isUploading) {
      return {
        label: "Uploading…",
        className: "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200",
        disabled: true,
        onClick: () => {},
      };
    }
    return {
      label: "Generate Try-On →",
      className: canGenerate
        ? "bg-[#4A6741] text-white hover:bg-[#3d5636] cursor-pointer shadow-lg shadow-[#4A6741]/20"
        : "bg-slate-100 text-foreground/20 cursor-not-allowed border border-slate-200",
      disabled: !canGenerate,
      onClick: handleGenerate,
    };
  };

  const btn = buttonConfig();

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col bg-background pt-16">
      {/* ── Page heading ──────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-12 pb-8 max-w-7xl mx-auto w-full text-center">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-[#1a1a1a]">
          Virtual Try-On{" "}
          <span className="text-[#4A6741]">
            Studio
          </span>
        </h1>
        <p className="text-slate-500 mt-4 text-lg font-medium max-w-2xl mx-auto">
          Upload your photo and a garment image — Vexa AI will generate the look in seconds.
        </p>
      </div>

      {/* ── Main panels ───────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 md:px-6 pb-20 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Left panel (40%) ──────────────────────────────────────────── */}
          <div className="w-full lg:w-[40%] flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-8 flex flex-col gap-8 border border-slate-100 shadow-xl shadow-slate-200/40">

              <ImageUploadBox
                label="Person Photo"
                sublabel="Full body photo works best"
                value={personUrl}
                onChange={setPersonUrl}
                onClear={() => { setPersonUrl(null); setPersonUploading(false); }}
                onUploadingChange={setPersonUploading}
                height="h-64 md:h-80"
              />

              <div className="flex flex-col gap-6">
                <ImageUploadBox
                  label="Garment Image"
                  sublabel="Flat-lay or model photo works"
                  value={garmentUrl}
                  onChange={setGarmentUrl}
                  onClear={() => { setGarmentUrl(null); setGarmentUploading(false); }}
                  onUploadingChange={setGarmentUploading}
                  height="h-64 md:h-80"
                />

                {/* Category pills */}
                <div className="flex gap-3 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-6 py-3 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${
                        category === cat.id
                          ? "bg-[#4A6741] text-white shadow-lg shadow-[#4A6741]/30"
                          : "bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-600"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right panel (60%) ─────────────────────────────────────────── */}
          <div className="w-full lg:w-[60%] flex flex-col">
            <div className="glass-panel p-8 flex flex-col h-full min-h-[600px] border border-slate-100 shadow-2xl shadow-slate-200/50">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                Try-On Result
              </p>

              <div className="flex-1 relative rounded-2xl overflow-hidden flex items-center justify-center bg-slate-50/50 border border-slate-100">
                <AnimatePresence mode="wait">

                  {/* Idle */}
                  {status === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 text-center p-8"
                    >
                      <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                        <Shirt className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-medium">
                        Your professional try-on result will appear here
                      </p>
                    </motion.div>
                  )}

                  {/* Loading */}
                  {status === "loading" && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 1 }}
                      className="flex flex-col items-center gap-6 text-center p-8"
                    >
                      <div className="relative">
                        <Loader2 className="w-16 h-16 text-[#bef264] animate-spin" />
                        <div className="absolute inset-0 rounded-full bg-[#bef264]/20 blur-2xl" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[#0f172a] text-xl font-black">
                          Vexa AI is working...
                        </p>
                        <p className="text-slate-500 text-sm font-medium">
                          Draping your clothing with high-precision physics.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Ready */}
                  {status === "ready" && resultUrl && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 1, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 1 }}
                      className="absolute inset-0"
                    >
                      <img
                        src={resultUrl}
                        alt="Try-on result"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="absolute bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0f172a] text-white hover:bg-slate-800 font-bold text-sm transition-all shadow-xl"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </motion.div>
                  )}

                  {/* Error */}
                  {status === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 text-center p-8"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center">
                        <RotateCcw className="w-6 h-6 text-rose-400" />
                      </div>
                      <p className="text-rose-500 font-bold">
                        {errorMsg}
                      </p>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-6 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                      >
                        Try Again
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <p
            className={`text-sm font-bold uppercase tracking-widest ${
              status === "error" ? "text-rose-500" : "text-slate-400"
            }`}
          >
            {statusText()}
          </p>
          <button
            type="button"
            disabled={btn.disabled}
            onClick={btn.onClick}
            className={`px-12 py-4 rounded-2xl text-base font-black uppercase tracking-widest transition-all shadow-2xl ${btn.className} ${status === 'ready' ? '' : 'shadow-lime-500/40'}`}
          >
            {btn.label}
          </button>
        </div>
      </div>
    </div>
  );
}
