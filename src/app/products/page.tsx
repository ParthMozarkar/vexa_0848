"use client";

import React, { useCallback, useState } from 'react';
import { Outfit, TryOnResult } from '@/types';
import { useStore } from '@/store/useStore';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Generate 12 mock products
const MOCK_PRODUCTS: Outfit[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `mock-prod-${i+1}`,
  name: `Premium Collection Item ${i+1}`,
  price: 89.99 + (i * 10),
  imageUrl: `https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400&h=600`,
  category: i % 2 === 0 ? "tops" : (i % 3 === 0 ? "dresses" : "outerwear")
} as Outfit));

export default function ProductsPage() {
  const { currentUser, userPhotoUrl } = useStore();
  const [results, setResults] = useState<Record<string, TryOnResult>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  // On-demand try-on: fires only when a user explicitly clicks "Try On" on a card.
  // This replaces the previous auto-batch that hammered Fashn.ai with 12
  // parallel calls on every mount.
  const runTryOn = useCallback(
    async (product: Outfit) => {
      if (!currentUser?.id || !userPhotoUrl) return;
      if (loadingMap[product.id]) return;

      setLoadingMap((prev) => ({ ...prev, [product.id]: true }));
      setErrorMap((prev) => ({ ...prev, [product.id]: '' }));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const res = await fetch('/api/tryon', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            userId: currentUser.id,
            userPhotoUrl,
            productId: product.id,
            productImageUrl: product.imageUrl,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || `Try-on failed (${res.status})`);
        }

        const resultUrl = (data as { resultUrl?: string }).resultUrl;
        if (!resultUrl) throw new Error('No result image returned');

        setResults((prev) => ({
          ...prev,
          [product.id]: {
            id: Date.now().toString(),
            userId: currentUser.id,
            productId: product.id,
            resultImage: resultUrl,
            originalImage: userPhotoUrl,
            outfit: product,
            status: 'ready',
          } as TryOnResult,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Try-on failed';
        console.error('[products] try-on failed:', message);
        setErrorMap((prev) => ({ ...prev, [product.id]: message }));
      } finally {
        setLoadingMap((prev) => ({ ...prev, [product.id]: false }));
      }
    },
    [currentUser, userPhotoUrl, loadingMap],
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12 relative min-h-screen">
      <div className="absolute top-0 right-0 w-1/2 h-[500px] bg-[#bef264]/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight text-center sm:text-left">
          Discover <span className="text-[#bef264]">Your</span> Look
        </h1>
        <p className="text-white/60 text-center sm:text-left text-lg max-w-2xl">
          Browse our latest collection. Tap &ldquo;Try On&rdquo; on any item to see it on you.
        </p>
      </div>

      {!userPhotoUrl && (
        <motion.div
          initial={{ opacity: 1, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 p-6 rounded-2xl glass-panel border border-[#bef264]/20 bg-gradient-to-r from-black/40 to-[#bef264]/5 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#bef264]/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-[#bef264]" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Upload your photo to see clothes on you</h3>
              <p className="text-white/50 text-sm">Personalize the entire store instantly.</p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#bef264] to-[#a3e635] text-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(190,242,100,0.4)] transition-shadow whitespace-nowrap"
          >
            Setup Profile
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {MOCK_PRODUCTS.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            tryOnResult={results[product.id]}
            isLoading={!!loadingMap[product.id]}
            onTryOn={userPhotoUrl ? () => runTryOn(product) : undefined}
            errorMessage={errorMap[product.id] || null}
          />
        ))}
      </div>
    </div>
  );
}
