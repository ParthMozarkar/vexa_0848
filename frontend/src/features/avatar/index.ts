// features/avatar/index.ts
// Barrel re-exports for the avatar feature.
// Zero file moves — consumers can use @/features/avatar without breaking existing imports.

// Components (named exports from their source files)
export { AvatarViewer } from '@/components/AvatarViewer';
export { AvatarCarousel } from '@/components/AvatarCarousel';
export { FaceCapture } from '@/components/FaceCapture';

// Types
export type { AvatarRecord, AvatarJob, AvatarStatus } from '@/types';
