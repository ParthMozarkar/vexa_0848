"use client";

/**
 * /embed — iframe-embeddable widget for marketplace product pages.
 * Minimal header, just the TryOnOverlay component.
 * Reads userId, productId, avatarUrl, clothingUrl from URL search params.
 *
 * Marketplaces embed via: <iframe src="/embed?userId=...&productId=...&..." />
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TryOnOverlay } from '@/components/TryOnOverlay';
import { Loader2 } from 'lucide-react';

function EmbedContent() {
  const params = useSearchParams();

  const userId = params.get('userId') ?? '';
  const productId = params.get('productId') ?? '';
  const avatarGlbUrl = params.get('avatarUrl') ?? '';
  const clothingGlbUrl = params.get('clothingUrl') ?? '';
  const apiKey = params.get('key') ?? 'vx_dev_test_key_local';
  const productName = params.get('productName') ?? 'Product';
  const productBrand = params.get('brand') ?? 'Brand';
  const price = parseFloat(params.get('price') ?? '0');

  if (!userId || !productId) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-white/40 text-sm">
        Missing required parameters: userId, productId
      </div>
    );
  }

  return (
    <div className="w-full h-full p-3">
      <TryOnOverlay
        userId={userId}
        productId={productId}
        avatarGlbUrl={avatarGlbUrl || 'https://cdn.vexa.dev/avatars/placeholder.glb'}
        clothingGlbUrl={clothingGlbUrl || 'https://cdn.vexa.dev/clothing/placeholder.glb'}
        apiKey={apiKey}
        product={{
          name: productName,
          brand: productBrand,
          price,
          currency: 'INR',
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
        }}
      />
    </div>
  );
}

export default function EmbedPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 gap-3 text-white/40 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading VEXA widget…
          </div>
        }
      >
        <EmbedContent />
      </Suspense>
    </div>
  );
}
