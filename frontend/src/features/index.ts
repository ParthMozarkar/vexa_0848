// features/index.ts
// Top-level barrel — re-exports all VEXA feature modules.
// Use sub-path imports for tree-shaking (e.g. @/features/tryon);
// this file exists for convenience when importing multiple features at once.

export * from './tryon';
export * from './avatar';
export * from './auth';
export * from './studio';
export * from './dashboard';
