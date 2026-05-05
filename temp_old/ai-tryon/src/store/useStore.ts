import { create } from 'zustand';
import { Outfit, TryOnResult } from '@/types';

interface AppState {
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
}

export const useStore = create<AppState>((set) => ({
  userImage: null,
  setUserImage: (image: string | null) => set({ userImage: image }),
  selectedOutfit: null,
  setSelectedOutfit: (outfit: Outfit | null) => set({ selectedOutfit: outfit }),
  isProcessing: false,
  setIsProcessing: (status: boolean) => set({ isProcessing: status }),
  processingStep: '',
  setProcessingStep: (step: string) => set({ processingStep: step }),
  tryOnResult: null,
  setTryOnResult: (result: TryOnResult | null) => set({ tryOnResult: result }),
  favorites: [],
  addFavorite: (result: TryOnResult) => set((state) => {
    if (state.favorites.some(f => f.id === result.id)) return state;
    return { favorites: [...state.favorites, result] };
  }),
  removeFavorite: (id: string) => set((state) => ({
    favorites: state.favorites.filter((f) => f.id !== id)
  })),
}));
