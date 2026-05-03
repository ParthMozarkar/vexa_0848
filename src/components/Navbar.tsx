"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X, ExternalLink } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/onboarding", label: "Get Started" },
  { href: "/studio", label: "Studio" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled
          ? "py-3 bg-black/60 backdrop-blur-2xl border-b border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
          : "py-6 bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group relative">
          <div className="absolute -inset-2 bg-[#6b7280]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9ca3af] to-[#6b7280] flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(107,114,128,0.2)] group-hover:shadow-[0_0_40px_rgba(107,114,128,0.4)] transition-all duration-500 transform group-hover:rotate-12">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-white text-xl tracking-tighter leading-none">VEXA</span>
            <span className="text-[10px] font-black text-[#9ca3af] tracking-[0.2em] uppercase mt-0.5">Studio</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  relative px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300
                  ${active ? "text-white" : "text-white/40 hover:text-white"}
                `}
              >
                {active && (
                  <motion.div
                    layoutId="navHeader"
                    className="absolute inset-0 bg-gradient-to-r from-[#00d9ff] to-[#ff006e] rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/dashboard">
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex items-center gap-2">
              API Docs
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </Link>
          <Link 
            href="/onboarding"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#9ca3af] to-[#6b7280] text-black text-xs font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(107,114,128,0.4)] transition-all duration-300"
          >
            Connect
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          id="navbar-mobile-toggle"
          className="md:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          onClick={() => setMobileOpen((p) => !p)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/10 bg-black/90 backdrop-blur-2xl overflow-hidden"
          >
            <div className="flex flex-col gap-2 p-6">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-lg font-bold ${
                    pathname === link.href ? "text-[#bef264]" : "text-white/70"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 flex flex-col gap-3">
                <Link
                  href="/onboarding"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 rounded-xl bg-[#bef264] text-black font-bold text-center"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
