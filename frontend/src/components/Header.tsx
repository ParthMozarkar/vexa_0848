'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { ArrowUpRight, Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const featureLinks = [
  { label: '3D Try-On', href: '/3d' },
  { label: 'Virtual Try-On', href: '/studio' },
  { label: 'Design from Text', href: '/design' },
  { label: 'Video Try-On', href: '/video-tryon' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-[#4A6741] flex items-center justify-center shadow-lg shadow-[#4A6741]/20 group-hover:rotate-12 transition-transform">
            <AppLogo size={26} />
          </div>
          <span className="text-2xl font-black text-[#1a1a1a] tracking-tighter uppercase">VEXA</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2 lg:gap-5">
          <Link href="/" className="px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all">
            Product
          </Link>
          <Link href="/about" className="px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all">
            About
          </Link>
          <Link href="/pricing" className="px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all">
            Pricing
          </Link>
          
          {/* Features Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setFeaturesOpen(true)}
            onMouseLeave={() => setFeaturesOpen(false)}
          >
            <button className="px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all flex items-center gap-1.5">
              Features <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${featuresOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {featuresOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl shadow-[#4A6741]/10 border border-slate-100 p-3 z-[110]"
                >
                  <div className="flex flex-col gap-1">
                    <p className="px-4 pt-2 pb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-50 mb-1">Select Experience</p>
                    {featureLinks.map((feature) => (
                      <Link
                        key={feature.href}
                        href={feature.href}
                        className="flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-[#4A6741] hover:bg-slate-50 rounded-2xl transition-all group/item"
                      >
                        {feature.label}
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-100 transition-all translate-x-[-4px] group-hover/item:translate-x-0" />
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link href="/integration" className="px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all">
            Integration
          </Link>
        </div>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="/#booking-section"
            className="bg-[#4A6741] text-white px-10 py-4 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl shadow-[#4A6741]/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            Book a Demo
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-[#1a1a1a] p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="p-8 flex flex-col gap-3">
              <Link href="/" className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a] py-3" onClick={() => setMenuOpen(false)}>Product</Link>
              <Link href="/about" className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a] py-3" onClick={() => setMenuOpen(false)}>About</Link>
              <Link href="/pricing" className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a] py-3" onClick={() => setMenuOpen(false)}>Pricing</Link>
              
              <div className="py-4 border-y border-slate-50 my-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-4">All Features</p>
                <div className="grid grid-cols-1 gap-3 pl-2">
                  {featureLinks.map((feature) => (
                    <Link 
                      key={feature.href} 
                      href={feature.href} 
                      className="text-sm font-bold text-slate-600 py-1 flex items-center justify-between"
                      onClick={() => setMenuOpen(false)}
                    >
                      {feature.label}
                      <ArrowUpRight className="w-4 h-4 text-slate-300" />
                    </Link>
                  ))}
                </div>
              </div>

              <Link href="/integration" className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a] py-3" onClick={() => setMenuOpen(false)}>Integration</Link>
              
              <a 
                href="/#booking-section"
                className="w-full mt-6 py-5 rounded-2xl bg-[#4A6741] text-white font-bold text-center uppercase tracking-widest text-xs shadow-xl shadow-[#4A6741]/20"
                onClick={() => setMenuOpen(false)}
              >
                Book a Demo
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}