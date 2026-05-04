"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

const MARKETING_ROUTES = ['/', '/3d', '/virtual-try-on', '/pricing', '/integration'];

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketing = MARKETING_ROUTES.includes(pathname);

  if (isMarketing) {
    return <>{children}</>;
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
