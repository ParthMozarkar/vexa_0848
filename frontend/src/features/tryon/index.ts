// features/tryon/index.ts
// Barrel re-exports for the try-on feature.
// Zero file moves — consumers can use @/features/tryon without breaking existing imports.

// Hooks
export { useTryOn } from '@/hooks/useTryOn';
export type { UseTryOnState } from '@/hooks/useTryOn';

// Types
export type { TryOnResult, TryOnRequest, TryOnCategory } from '@/types';

// Components (named exports — see source files for export style)
export { TryOnOverlay } from '@/components/TryOnOverlay';
export { VideoTryOn } from '@/components/VideoTryOn';
