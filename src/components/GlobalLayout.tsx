"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

const MARKETING_ROUTES = ['/', '/3d', '/virtual-try-on', '/pricing', '/integration', '/studio', '/admin'];

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketing = MARKETING_ROUTES.includes(pathname);

  if (isMarketing) {
    return (
      <div className="marketing-theme text-foreground">
        <style dangerouslySetInnerHTML={{ __html: `
          body { background: none !important; animation: none !important; filter: none !important; background-color: var(--background) !important; }
          body::before { display: none !important; }
        `}} />
        {children}
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        {children}
      </main>
      <Footer />
    </>
  );
}
