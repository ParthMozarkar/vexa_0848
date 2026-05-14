// Selector hooks for Zustand store — memoized slices to prevent unnecessary re-renders.
// Import these instead of calling useStore() with inline selectors.
import { useStore } from './useStore';

// ─── Try-On selectors ─────────────────────────────────────────────────────────
export const useTryOnState = () =>
  useStore((s) => ({
    userImage: s.userImage,
    selectedOutfit: s.selectedOutfit,
    isProcessing: s.isProcessing,
    processingStep: s.processingStep,
    tryOnResult: s.tryOnResult,
  }));

export const useTryOnActions = () =>
  useStore((s) => ({
    setUserImage: s.setUserImage,
    setSelectedOutfit: s.setSelectedOutfit,
    setIsProcessing: s.setIsProcessing,
    setProcessingStep: s.setProcessingStep,
    setTryOnResult: s.setTryOnResult,
  }));

// ─── Auth selectors ───────────────────────────────────────────────────────────
export const useAuthState = () =>
  useStore((s) => ({
    currentUser: s.currentUser,
    userPhotoUrl: s.userPhotoUrl,
  }));

export const useAuthActions = () =>
  useStore((s) => ({
    setCurrentUser: s.setCurrentUser,
    setUserPhotoUrl: s.setUserPhotoUrl,
  }));

// ─── Favorites selectors ──────────────────────────────────────────────────────
export const useFavorites = () => useStore((s) => s.favorites);
export const useFavoriteActions = () =>
  useStore((s) => ({
    addFavorite: s.addFavorite,
    removeFavorite: s.removeFavorite,
  }));

// ─── Loading / error selectors ────────────────────────────────────────────────
export const useLoadingState = (key: string) =>
  useStore((s) => s.loadingStates[key] ?? false);
export const useErrorState = (key: string) =>
  useStore((s) => s.errors[key] ?? null);

export const useLoadingActions = () =>
  useStore((s) => ({
    setLoading: s.setLoading,
    setError: s.setError,
    clearError: s.clearError,
    clearAllErrors: s.clearAllErrors,
  }));

// ─── Convenience: named loading keys ─────────────────────────────────────────
export const LOADING_KEYS = {
  TRYON: 'tryon',
  AVATAR_GENERATE: 'avatar.generate',
  DESIGN: 'studio.design',
  MODEL_GEN: 'studio.modelGen',
  UPLOAD: 'upload',
  AUTH: 'auth',
} as const;
