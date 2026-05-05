'use client'
import React from 'react'

export const Spinner = ({ className = "" }: { className?: string }) => (
  <div className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
);

export const Badge = ({ children, variant = "primary", className = "" }: { children: React.ReactNode, variant?: 'primary' | 'secondary' | 'outline', className?: string }) => {
  const variants = {
    primary: 'bg-[#bef264]/10 text-[#bef264] border-[#bef264]/20',
    secondary: 'bg-white/5 text-white/70 border-white/10',
    outline: 'bg-transparent text-white/50 border-white/10',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
};
