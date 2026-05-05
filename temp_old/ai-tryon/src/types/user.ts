export type User = {
  id: string
  email: string
  height_cm: number
  chest_cm: number
  waist_cm: number
  hips_cm: number
  inseam_cm: number
  shoulder_cm: number
  avatar_url: string | null
  face_texture_url: string | null
  created_at: string
}

export type Measurements = {
  height_cm: number
  chest_cm: number
  waist_cm: number
  hips_cm: number
  inseam_cm: number
  shoulder_cm: number
}
