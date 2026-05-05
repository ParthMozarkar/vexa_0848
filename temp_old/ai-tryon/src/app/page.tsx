"use client";
import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight, Sparkles, CheckCircle2, Zap, ShieldCheck,
  Ruler, Globe, Key, Layers, BarChart3, ChevronRight,
} from "lucide-react";

const INTEGRATIONS = ["Myntra", "AJIO", "Amazon Fashion", "Nykaa Fashion", "Meesho", "Flipkart"];

const PIPELINE_STEPS = [
  { step: "01", title: "Marketplace calls /avatar/generate", desc: "Sends user photo + measurements via authenticated API key." },
  { step: "02", title: "Python microservice runs SMPL-X", desc: "Face landmarks extracted, beta params regressed, archetypes blended." },
  { step: "03", title: "Avatar GLB cached to R2/S3", desc: "Signed URL returned — no raw paths, expiry enforced." },
  { step: "04", title: "TryOnOverlay on every product page", desc: "Clothing GLB draped over avatar in real-time React Three Fiber scene." },
];

const FEATURES = [
  { icon: Layers, title: "SMPL-X Body Model", desc: "30–40 pre-baked archetypes blended via morph targets. No per-request inference." },
  { icon: ShieldCheck, title: "Privacy by Design", desc: "Face photos deleted after UV extraction. Measurement data encrypted at rest. GDPR deletion endpoint included." },
  { icon: Key, title: "API-Key Auth", desc: "Every request validated via x-vexa-key header. Marketplace scoped, revocable, audited." },
  { icon: Globe, title: "Signed CDN Delivery", desc: "All GLB assets served via Cloudflare R2 presigned URLs. Raw paths never exposed." },
  { icon: BarChart3, title: "Fit Heatmap", desc: "Per-product pressure map overlay shows where clothing fits tight, loose, or perfect." },
  { icon: Zap, title: "Sub-second Try-On", desc: "Archetype blending happens in Three.js — no round-trip to server on pose switch." },
];

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 pb-24 pt-16">
        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#bef264]/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Floating badge cards */}
        <div className="absolute inset-0 pointer-events-none hidden lg:block overflow-hidden">
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[22%] left-[8%] glass-panel border border-[#bef264]/20 rounded-2xl p-4 shadow-xl"
          >
            <p className="text-white/40 text-xs mb-1">Fit Score</p>
            <p className="text-[#bef264] font-bold text-2xl">94%</p>
            <p className="text-white/30 text-xs mt-1">↑ from 68% (size guess)</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, -18, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[18%] right-[10%] glass-panel border border-white/10 rounded-2xl p-4 shadow-xl"
          >
            <p className="text-white/40 text-xs mb-1">Return Rate</p>
            <div className="flex items-end gap-1">
              <p className="text-white font-bold text-2xl">−31%</p>
              <span className="text-[#bef264] text-xs mb-1">avg</span>
            </div>
            <p className="text-white/30 text-xs mt-1">after VEXA integration</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[18%] left-[14%] glass-panel border border-white/10 rounded-2xl px-4 py-3 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#bef264] animate-pulse" />
              <span className="text-white/60 text-xs">SMPL-X pipeline · 2.1s avg</span>
            </div>
          </motion.div>
        </div>

        {/* Hero content */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-[#bef264]/30 mb-8"
          >
            <Sparkles className="w-4 h-4 text-[#bef264]" />
            <span className="text-[#bef264] text-sm font-medium uppercase tracking-wider">B2B SaaS API Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-6 leading-[1.05]"
          >
            Every Shopper{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bef264] via-[#d9f99d] to-[#a3e635] drop-shadow-[0_0_40px_rgba(190,242,100,0.25)]">
              Gets Their
            </span>{" "}
            <br />
            Own 3D Body Avatar.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xl md:text-2xl text-white/55 mb-10 max-w-3xl leading-relaxed"
          >
            Fashion marketplaces embed one API key. Their end-users upload one photo.
            VEXA returns a personalized SMPL-X avatar — clothes rendered on them, not a generic mannequin.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/onboarding">
              <motion.button
                id="hero-cta-primary"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg bg-[#bef264] text-black hover:bg-[#a3e635] shadow-[0_0_50px_rgba(190,242,100,0.4)] transition-all duration-300"
              >
                <Sparkles className="w-5 h-5" />
                Build Your Avatar
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
            <Link href="/dashboard">
              <button
                id="hero-cta-secondary"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all duration-300"
              >
                View Dashboard
                <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── 2. INTEGRATION MARQUEE ───────────────────────────────────────────── */}
      <section className="py-12 border-y border-white/5 overflow-hidden">
        <p className="text-center text-white/30 text-sm font-medium uppercase tracking-widest mb-8">
          Powering try-on for
        </p>
        <div className="flex gap-12 animate-marquee whitespace-nowrap">
          {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
            <span key={i} className="text-white/25 text-lg font-semibold hover:text-white/60 transition-colors cursor-default">
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 py-28">
        <div className="text-center mb-16">
          <p className="text-[#bef264] text-sm font-semibold uppercase tracking-widest mb-3">API Pipeline</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">How VEXA Works</h2>
          <p className="text-white/50 text-lg mt-3 max-w-2xl mx-auto">
            From marketplace API call to 3D try-on in every product page — four clean steps.
          </p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[#bef264]/30 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PIPELINE_STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12 }}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-[#bef264]/30 transition-all group relative"
              >
                <div className="w-12 h-12 rounded-xl bg-[#bef264]/10 group-hover:bg-[#bef264]/20 flex items-center justify-center mb-5 transition-colors">
                  <span className="text-[#bef264] font-bold text-sm">{s.step}</span>
                </div>
                <h3 className="text-white font-semibold mb-2 leading-snug">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FEATURES GRID ────────────────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 py-28 border-t border-white/5">
        <div className="text-center mb-16">
          <p className="text-[#bef264] text-sm font-semibold uppercase tracking-widest mb-3">Platform</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">Enterprise-Grade, Out of the Box</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.07 }}
              className="glass-panel p-7 rounded-2xl border border-white/10 hover:border-[#bef264]/20 transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#bef264]/10 group-hover:bg-[#bef264]/20 flex items-center justify-center mb-5 transition-colors">
                <f.icon className="w-5 h-5 text-[#bef264]" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 5. API SNIPPET ──────────────────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 py-28 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[#bef264] text-sm font-semibold uppercase tracking-widest mb-3">Integration</p>
            <h2 className="text-4xl font-bold text-white mb-5">One API key.<br />Works everywhere.</h2>
            <p className="text-white/50 mb-6 leading-relaxed">
              Embed VEXA in your marketplace in under an hour. Ship the API key, drop in the 
              <code className="text-[#bef264] mx-1 font-mono text-sm">TryOnOverlay</code>
              iframe, done. Your users get their personal 3D body double on every product page.
            </p>
            <ul className="space-y-3">
              {[
                "Auth via x-vexa-key header",
                "Webhook callback when GLB is ready",
                "GDPR deletion endpoint included",
                "99.9% uptime SLA",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/70 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#bef264] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-[#bef264]/60" />
              <span className="text-white/30 text-xs ml-2 font-mono">POST /api/avatar/generate</span>
            </div>
            <pre className="p-5 text-sm font-mono text-white/70 overflow-x-auto leading-relaxed">
              <code>{`fetch('/api/avatar/generate', {
  method: 'POST',
  headers: {
    'x-vexa-key': 'vx_live_myntra_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'usr_8f2k91',
    photoBase64: '...base64...',
    measurements: {
      heightCm: 168,
      chestCm: 92,
      waistCm: 72,
      hipsCm: 98,
      inseamCm: 78,
      shoulderWidthCm: 41,
      weightKg: 65,
    },
  }),
});

// → { job_id: 'job_...', status: 'queued',
//     pollUrl: '/api/avatar/usr_8f2k91' }`}</code>
            </pre>
          </motion.div>
        </div>
      </section>

      {/* ── 6. CTA ──────────────────────────────────────────────────────────── */}
      <section className="w-full px-4 py-28 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#bef264]/10 border border-[#bef264]/20 mb-6">
              <Zap className="w-4 h-4 text-[#bef264]" />
              <span className="text-[#bef264] text-sm font-medium">Ready to integrate?</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Start building with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bef264] to-[#a3e635]">
                VEXA today.
              </span>
            </h2>
            <p className="text-white/50 text-lg mb-8">
              Try the full onboarding flow. Generate your own 3D avatar in under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/onboarding">
                <motion.button
                  id="cta-build-avatar"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-5 rounded-2xl font-bold text-xl bg-[#bef264] text-black hover:bg-[#a3e635] shadow-[0_0_60px_rgba(190,242,100,0.5)] transition-all flex items-center gap-3"
                >
                  <Sparkles className="w-5 h-5" />
                  Build Your Avatar
                </motion.button>
              </Link>
              <Link href="/studio">
                <button className="px-8 py-5 rounded-2xl font-bold text-lg border border-white/15 text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all">
                  Open Studio
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#bef264] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-black" />
            </div>
            <span className="text-white font-semibold">VEXA</span>
            <span className="text-white/30 text-sm">— AI 3D Body Avatar Platform</span>
          </div>
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} Vexa Technologies Inc. · Privacy · Terms · API Docs
          </p>
        </div>
      </footer>
    </div>
  );
}
