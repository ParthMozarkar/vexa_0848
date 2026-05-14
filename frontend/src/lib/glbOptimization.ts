// GLB/3D optimization utilities
// Draco decompressor must be configured in DRACOLoader — see draco decoder path below

export const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

export interface GLBLoadOptions {
  useDraco?: boolean;
  mobileQuality?: boolean;
  preload?: boolean;
}

// Mobile-safe GLB URL transformer
// On low-end devices, append quality hint for CDN-level optimization
export function getOptimizedGlbUrl(url: string, options: GLBLoadOptions = {}): string {
  if (!url) return url;
  if (!options.mobileQuality) return url;
  // If URL is from our R2 bucket, we could append a transform param
  // For now return as-is — hook for future CDN image transform
  return url;
}

// Texture resolution limits per device tier
export const TEXTURE_LIMITS = {
  high: 2048,
  medium: 1024,
  low: 512,
} as const;

export type TextureQuality = keyof typeof TEXTURE_LIMITS;

export function getTextureQuality(isMobile: boolean, isLowEnd: boolean): TextureQuality {
  if (isLowEnd) return 'low';
  if (isMobile) return 'medium';
  return 'high';
}
