import { create } from 'zustand';
import { Outfit, TryOnResult } from '@/types';
import type { UserWithMeasurements } from '@/hooks/useUser';

interface AppState {
  // ─── Existing try-on state ───────────────────────────────────────────────
  userImage: string | null;
  setUserImage: (image: string | null) => void;
  selectedOutfit: Outfit | null;
  setSelectedOutfit: (outfit: Outfit | null) => void;
  isProcessing: boolean;
  setIsProcessing: (status: boolean) => void;
  processingStep: string;
  setProcessingStep: (step: string) => void;
  tryOnResult: TryOnResult | null;
  setTryOnResult: (result: TryOnResult | null) => void;
  favorites: TryOnResult[];
  addFavorite: (result: TryOnResult) => void;
  removeFavorite: (id: string) => void;

  // ─── Auth / user state ───────────────────────────────────────────────────
  /** Authenticated user with measurements from the `users` table. */
  currentUser: UserWithMeasurements | null;
  setCurrentUser: (user: UserWithMeasurements | null) => void;

  /** Public URL of the uploaded avatar photo (stored in Supabase Storage). */
  userPhotoUrl: string | null;
  setUserPhotoUrl: (url: string | null) => void;

  /** Transient garment URL passed from the design page to the studio page.
   *  Used instead of a query-param to avoid URL-length limits with data: URIs. */
  pendingGarmentUrl: string | null;
  setPendingGarmentUrl: (url: string | null) => void;

  // ─── Centralized loading states ──────────────────────────────────────────
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, value: boolean) => void;
  isLoading: (key: string) => boolean;

  // ─── Error states ─────────────────────────────────────────────────────────
  errors: Record<string, string | null>;
  setError: (key: string, error: string | null) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // ─── Try-on ──────────────────────────────────────────────────────────────
  userImage: null,
  setUserImage: (image) => set({ userImage: image }),
  selectedOutfit: null,
  setSelectedOutfit: (outfit) => set({ selectedOutfit: outfit }),
  isProcessing: false,
  setIsProcessing: (status) => set({ isProcessing: status }),
  processingStep: '',
  setProcessingStep: (step) => set({ processingStep: step }),
  tryOnResult: null,
  setTryOnResult: (result) => set({ tryOnResult: result }),
  favorites: [],
  addFavorite: (result) =>
    set((state) => {
      if (state.favorites.some((f) => f.id === result.id)) return state;
      return { favorites: [...state.favorites, result] };
    }),
  removeFavorite: (id) =>
    set((state) => ({
      favorites: state.favorites.filter((f) => f.id !== id),
    })),

  // ─── Auth ─────────────────────────────────────────────────────────────────
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  userPhotoUrl: null,
  setUserPhotoUrl: (url) => set({ userPhotoUrl: url }),

  pendingGarmentUrl: null,
  setPendingGarmentUrl: (url) => set({ pendingGarmentUrl: url }),

  // ─── Centralized loading ──────────────────────────────────────────────────
  loadingStates: {},
  setLoading: (key, value) =>
    set((state) => ({
      loadingStates: { ...state.loadingStates, [key]: value },
    })),
  isLoading: (key) => get().loadingStates[key] ?? false,

  // ─── Errors ───────────────────────────────────────────────────────────────
  errors: {},
  setError: (key, error) =>
    set((state) => ({
      errors: { ...state.errors, [key]: error },
    })),
  clearError: (key) =>
    set((state) => ({
      errors: { ...state.errors, [key]: null },
    })),
  clearAllErrors: () => set({ errors: {} }),
}));
