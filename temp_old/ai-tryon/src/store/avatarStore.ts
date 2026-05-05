import { create } from 'zustand'
import type { Avatar, AvatarStatus } from '@/types'

type AvatarState = {
  avatar: Avatar | null
  status: AvatarStatus
  glbUrl: string | null
  setAvatar: (avatar: Avatar) => void
  setStatus: (status: AvatarStatus) => void
  setGlbUrl: (url: string) => void
  reset: () => void
}

export const useAvatarStore = create<AvatarState>((set) => ({
  avatar: null,
  status: 'idle',
  glbUrl: null,
  setAvatar: (avatar) => set({ avatar, glbUrl: avatar.glb_url, status: avatar.status }),
  setStatus: (status) => set({ status }),
  setGlbUrl: (glbUrl) => set({ glbUrl }),
  reset: () => set({ avatar: null, status: 'idle', glbUrl: null }),
}))
