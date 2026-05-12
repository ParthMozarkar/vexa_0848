'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { ArrowUpRight, Menu, X, ChevronDown, Sparkles } from 'lucide-react';
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

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [menuOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ${
        scrolled ? 'bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 shadow-sm py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[#4A6741] flex items-center justify-center shadow-lg shadow-[#4A6741]/20 group-hover:rotate-12 transition-transform">
            <AppLogo size={24} />
          </div>
          <span className="text-xl md:text-2xl font-black text-[#1a1a1a] tracking-tighter uppercase">VEXA</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4">
          <Link href="/" className="px-3 py-2 text-[12px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all">
            Product
          </Link>
          <Link href="/pricing" className="px-3 py-2 text-[12px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all">
            Pricing
          </Link>
          
          {/* Features Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setFeaturesOpen(true)}
            onMouseLeave={() => setFeaturesOpen(false)}
          >
            <button className="px-3 py-2 text-[12px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all flex items-center gap-1.5">
              Features <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${featuresOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {featuresOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl shadow-[#4A6741]/10 border border-slate-100 p-3 z-[110]"
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

          <Link href="/integration" className="px-3 py-2 text-[12px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all">
            Integration
          </Link>
        </div>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="/#booking-section"
            className="bg-[#4A6741] text-white px-8 lg:px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-[#4A6741]/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            Book a Demo
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-[#1a1a1a] p-2 focus:outline-none" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-0 left-0 w-full h-screen bg-white z-[90] flex flex-col md:hidden"
          >
            <div className="flex-1 overflow-y-auto px-8 pt-24 pb-12">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">Main Navigation</p>
                  <Link href="/" className="text-3xl font-black text-[#1a1a1a] py-2" onClick={() => setMenuOpen(false)}>Product</Link>
                  <Link href="/pricing" className="text-3xl font-black text-[#1a1a1a] py-2" onClick={() => setMenuOpen(false)}>Pricing</Link>
                  <Link href="/integration" className="text-3xl font-black text-[#1a1a1a] py-2" onClick={() => setMenuOpen(false)}>Integration</Link>
                </div>
                
                <div className="py-8 border-y border-slate-100 my-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-6">Experience Studio</p>
                  <div className="grid grid-cols-1 gap-6">
                    {featureLinks.map((feature) => (
                      <Link 
                        key={feature.href} 
                        href={feature.href} 
                        className="text-xl font-bold text-slate-800 flex items-center justify-between group"
                        onClick={() => setMenuOpen(false)}
                      >
                        {feature.label}
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#4A6741]/10 group-hover:text-[#4A6741] transition-colors">
                          <ArrowUpRight className="w-5 h-5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-4">
                  <a 
                    href="/#booking-section"
                    className="w-full py-6 rounded-[2rem] bg-[#4A6741] text-white font-black text-center uppercase tracking-widest text-xs shadow-2xl shadow-[#4A6741]/30 flex items-center justify-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Sparkles className="w-4 h-4" />
                    Book a Demo
                  </a>
                  <p className="text-center text-slate-400 text-[10px] font-medium tracking-wide">Join 200+ brands revolutionizing retail.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}