// features/dashboard/index.ts
// Barrel re-exports for the dashboard feature.
// Zero file moves — consumers can use @/features/dashboard without breaking existing imports.

// Zustand store (named export)
export { useStore } from '@/store/useStore';

// AppState interface is not exported from useStore — consumers needing the type
// should import directly from @/store/useStore or cast via ReturnType<typeof useStore.getState>
