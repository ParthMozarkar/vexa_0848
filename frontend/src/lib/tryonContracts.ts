import type { TryOnCategory } from '@/types';

/**
 * Canonical input for the 2D TNB try-on pipeline (`handleTryOn`).
 * `avatarGlbUrl` / `clothingGlbUrl` are legacy field names from the 3D overlay hook;
 * they are treated as opaque HTTPS URLs passed through to the same resolver as photos.
 */
export interface HandleTryOnInput {
  userId: string;
  productId: string;
  userPhotoUrl?: string;
  productImageUrl?: string;
  category?: TryOnCategory;
  garments?: { url: string; category: TryOnCategory }[];
  /** Legacy alias used by `useTryOn` / TryOnOverlay */
  avatarGlbUrl?: string;
  /** Legacy alias used by `useTryOn` / TryOnOverlay */
  clothingGlbUrl?: string;
}

export interface HandleTryOnResult {
  resultUrl: string;
  status: 'ready';
  fitLabel: string;
  recommendedSize: string;
  fitScore: number;
  /** Always false today — reserved for future cache hits without vendor calls */
  cached: boolean;
  /** Reserved for future persistence metadata */
  storagePath: string;
}
