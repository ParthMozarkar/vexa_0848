import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";


export const metadata: Metadata = {
  metadataBase: new URL('https://vexatryon.in'),
  title: {
    default: 'VEXA — Virtual Try-On API for Fashion Brands',
    template: '%s | VEXA'
  },
  description: 'Revolutionize your fashion brand with VEXA\'s Virtual Try-On API. Reduce returns by 40% and increase conversions with AI-powered 3D garment visualization.',
  keywords: ['Virtual Try-On', 'VEXA', 'Fashion AI', 'E-commerce SDK', 'AI Fashion', 'Virtual Fitting Room', 'Digital Garments'],
  authors: [{ name: 'Vexa Team' }],
  creator: 'Vexa Solutions',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://vexatryon.in',
    title: 'VEXA — Virtual Try-On API for Fashion Brands',
    description: 'Transform your e-commerce experience with AI-powered virtual try-on.',
    siteName: 'VEXA',
    images: [
      {
        url: '/assets/images/app_logo.png',
        width: 1200,
        height: 630,
        alt: 'VEXA AI Virtual Try-On',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VEXA — Virtual Try-On API for Fashion Brands',
    description: 'AI-powered virtual try-on for the next generation of fashion brands.',
    images: ['/assets/images/app_logo.png'],
  },
  verification: {
    google: 'OzdMEB7tqmLLYhYKIsvtWX6CZwf4M6zyImfKOD_L3Pw',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Navbar />
        <main className="min-h-screen pt-20">
          {children}
        </main>
        <Footer />
        <Analytics />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""} />
      </body>
    </html>
  );
}
