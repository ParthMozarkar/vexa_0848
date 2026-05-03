"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, RotateCcw } from "lucide-react";
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
        className: "bg-[#bef264]/50 text-black/50 cursor-not-allowed",
        disabled: true,
        onClick: () => {},
      };
    }
    if (status === "ready") {
      return {
        label: "Try Again →",
        className:
          "bg-white/10 border border-white/10 text-white hover:bg-white/15",
        disabled: false,
        onClick: handleReset,
      };
    }
    if (isUploading) {
      return {
        label: "Uploading…",
        className: "bg-white/5 text-white/30 cursor-not-allowed border border-white/10",
        disabled: true,
        onClick: () => {},
      };
    }
    return {
      label: "Generate Try-On →",
      className: canGenerate
        ? "bg-[#bef264] text-black hover:bg-[#a3e635] cursor-pointer"
        : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10",
      disabled: !canGenerate,
      onClick: handleGenerate,
    };
  };

  const btn = buttonConfig();

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col bg-[#0a0a0a]">
      {/* ── Page heading ──────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-8 pb-4 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
          Virtual Try-On{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bef264] to-[#ecfccb]">
            Studio
          </span>
        </h1>
        <p className="text-white/40 mt-2 text-sm">
          Upload your photo and a garment image — Vexa AI will generate the look.
        </p>
      </div>

      {/* ── Main panels ───────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 md:px-6 pb-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">

          {/* ── Left panel (40%) ──────────────────────────────────────────── */}
          <div className="w-full md:w-[40%] flex flex-col gap-4">
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 flex flex-col gap-6">

              <ImageUploadBox
                label="Person Photo"
                sublabel="Full body photo works best"
                value={personUrl}
                onChange={setPersonUrl}
                onClear={() => { setPersonUrl(null); setPersonUploading(false); }}
                onUploadingChange={setPersonUploading}
                height="h-48 md:h-72"
              />

              <div className="flex flex-col gap-4">
                <ImageUploadBox
                  label="Garment Image"
                  sublabel="Flat-lay or model photo works"
                  value={garmentUrl}
                  onChange={setGarmentUrl}
                  onClear={() => { setGarmentUrl(null); setGarmentUploading(false); }}
                  onUploadingChange={setGarmentUploading}
                  height="h-48 md:h-64"
                />

                {/* Category pills */}
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${
                        category === cat.id
                          ? "bg-[#bef264] text-black"
                          : "bg-white/5 text-white/50 border border-white/10 hover:text-white/80"
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
          <div className="w-full md:w-[60%] flex flex-col">
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 flex flex-col h-full min-h-[500px] md:min-h-[600px]">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
                Try-On Result
              </p>

              <div className="flex-1 relative rounded-xl overflow-hidden flex items-center justify-center bg-black/20 border border-white/5">
                <AnimatePresence mode="wait">

                  {/* Idle */}
                  {status === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-3 text-center p-8"
                    >
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-sm bg-white/10" />
                      </div>
                      <p className="text-white/30 text-sm">
                        Your try-on will appear here
                      </p>
                    </motion.div>
                  )}

                  {/* Loading */}
                  {status === "loading" && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 text-center p-8"
                    >
                      <div className="relative">
                        <Loader2 className="w-12 h-12 text-[#bef264] animate-spin" />
                        <div className="absolute inset-0 rounded-full bg-[#bef264]/10 blur-xl" />
                      </div>
                      <p className="text-white/60 text-sm font-medium">
                        Generating try-on with Vexa AI…
                      </p>
                      <p className="text-white/30 text-xs">
                        Usually 15–60 s · may take up to 2 min on first use
                      </p>
                      {/* shimmer bar */}
                      <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden mt-2">
                        <motion.div
                          className="h-full bg-gradient-to-r from-transparent via-[#bef264]/60 to-transparent"
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Ready */}
                  {status === "ready" && resultUrl && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
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
                        className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all hover:bg-black/80"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </motion.div>
                  )}

                  {/* Error */}
                  {status === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 text-center p-8"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <RotateCcw className="w-5 h-5 text-rose-400" />
                      </div>
                      <p className="text-rose-400 text-sm font-medium max-w-xs">
                        {errorMsg}
                      </p>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs transition-colors"
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
      <div className="sticky bottom-0 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-white/10 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex flex-col sm:flex-row items-center justify-between gap-2 py-2 sm:py-0">
          <p
            className={`text-sm ${
              status === "error" ? "text-rose-400" : "text-white/50"
            }`}
          >
            {statusText()}
          </p>
          <button
            type="button"
            disabled={btn.disabled}
            onClick={btn.onClick}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${btn.className}`}
          >
            {btn.label}
          </button>
        </div>
      </div>
    </div>
  );
}
