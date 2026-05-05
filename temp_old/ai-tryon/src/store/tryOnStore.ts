import { create } from 'zustand'
import type { TryOnResult, Product } from '@/types'

type TryOnState = {
  results: Record<string, TryOnResult>
  selectedProduct: Product | null
  isProcessing: boolean
  setResult: (productId: string, result: TryOnResult) => void
  setSelectedProduct: (product: Product | null) => void
  setProcessing: (processing: boolean) => void
  clearResults: () => void
}

export const useTryOnStore = create<TryOnState>((set) => ({
  results: {},
  selectedProduct: null,
  isProcessing: false,
  setResult: (productId: string, result: TryOnResult) =>
    set((state) => ({ results: { ...state.results, [productId]: result } })),
  setSelectedProduct: (selectedProduct: Product | null) => set({ selectedProduct }),
  setProcessing: (isProcessing: boolean) => set({ isProcessing }),
  clearResults: () => set({ results: {} }),
}))
