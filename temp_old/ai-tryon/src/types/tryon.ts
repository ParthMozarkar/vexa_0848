export type TryOnStatus = 'idle' | 'queued' | 'processing' | 'ready' | 'error'

export type TryOnResult = {
  id: string
  user_id?: string
  userId?: string
  product_id?: string
  productId?: string
  original_image_url?: string
  originalImage?: string
  result_url?: string
  resultImage?: string
  status: TryOnStatus
  created_at?: string
  // Extended fields used by VEXA pipeline
  renderUrl?: string
  fitScore?: number
  sizeRecommendation?: string
  heatmapUrl?: string
  // Legacy MVP fields
  outfit?: {
    id: string
    name: string
    price: number
    imageUrl: string
    category: string
  }
  aiAnalysis?: {
    confidence: number
    size: string
    suggestion: string
  }
}

export type FitLabel = 'too_tight' | 'true_to_size' | 'oversized'

export type FitResult = {
  product_id: string
  recommended_size: string
  fit_label: FitLabel
  chest_delta_cm: number
  waist_delta_cm: number
  hips_delta_cm: number
}

export type BatchTryOnRequest = {
  product_ids: string[]
  user_id: string
}

export type BatchTryOnResult = {
  product_id: string
  result: TryOnResult | null
  status: TryOnStatus
}
