export type AvatarStatus = 'idle' | 'queued' | 'processing' | 'ready' | 'error'

export type Avatar = {
  id: string
  user_id: string
  glb_url: string
  face_texture_url: string
  status: AvatarStatus
  archetype_ids: string[]
  blend_weights: number[]
  created_at: string
}

export type Archetype = {
  id: string
  glb_url: string
  betas: number[]
  height_cm: number
  description: string
}
