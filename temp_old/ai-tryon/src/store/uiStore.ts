import { create } from 'zustand'

type UIState = {
  isAvatarViewerOpen: boolean
  isMeasurementModalOpen: boolean
  isFaceCaptureOpen: boolean
  activeTab: string
  setAvatarViewerOpen: (open: boolean) => void
  setMeasurementModalOpen: (open: boolean) => void
  setFaceCaptureOpen: (open: boolean) => void
  setActiveTab: (tab: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  isAvatarViewerOpen: false,
  isMeasurementModalOpen: false,
  isFaceCaptureOpen: false,
  activeTab: 'overview',
  setAvatarViewerOpen: (isAvatarViewerOpen: boolean) => set({ isAvatarViewerOpen }),
  setMeasurementModalOpen: (isMeasurementModalOpen: boolean) => set({ isMeasurementModalOpen }),
  setFaceCaptureOpen: (isFaceCaptureOpen: boolean) => set({ isFaceCaptureOpen }),
  setActiveTab: (activeTab: string) => set({ activeTab }),
}))
