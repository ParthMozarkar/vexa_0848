'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Product', href: '/' },
  { label: '3D Try-On', href: '/3d' },
  { label: 'Virtual Try-On', href: '/studio' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Integration', href: '/integration' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-[#4A6741] flex items-center justify-center shadow-lg shadow-lime-900/20 group-hover:rotate-12 transition-transform">
            <AppLogo size={24} />
          </div>
          <span className="text-xl font-black text-[#1a1a1a] tracking-tighter">VEXA</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              // Added px-4 py-2 to drastically increase the clickable hit area
              className="px-4 py-2 text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-[#1a1a1a] transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <a
            href="/#booking-section"
            className="bg-[#4A6741] text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-[#4A6741]/20 flex items-center gap-2 hover:scale-105 transition-all"
          >
            Book a Demo
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-[#1a1a1a]" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 p-6 flex flex-col gap-4 shadow-xl">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className="text-lg font-bold text-[#1a1a1a]"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a 
            href="/#booking-section"
            className="w-full py-4 rounded-xl bg-[#4A6741] text-white font-bold text-center"
            onClick={() => setMenuOpen(false)}
          >
            Book a Demo
          </a>
        </div>
      )}
    </nav>
  );
}