// ─── Marketplace & Auth ─────────────────────────────────────────────────────

export interface MarketplaceContext {
  marketplaceId: string;
  name: string;
  apiKey: string;
  webhookUrl?: string;
  createdAt: string;
}

// ─── Body Measurements ───────────────────────────────────────────────────────

export interface BodyMeasurements {
  heightCm: number;
  weightKg: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  inseamCm: number;
  shoulderWidthCm: number;
  /** Estimated from measurements — never derived in Next.js */
  betaEstimate?: number[];
}

export type MeasurementUnit = 'cm' | 'inch';

// ─── Avatar Pipeline ─────────────────────────────────────────────────────────

export type AvatarStatus = 'queued' | 'processing' | 'ready' | 'error';

export interface AvatarJob {
  jobId: string;
  userId: string;
  status: AvatarStatus;
  progress?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface AvatarRecord {
  userId: string;
  jobId: string;
  status: AvatarStatus;
  glbUrl?: string; // always signed, never public
  signedExpiry?: string;
  measurements: BodyMeasurements;
  archetypeIds?: string[];
  blendWeights?: number[];
  createdAt: string;
  updatedAt: string;
}

// ─── Try-On ──────────────────────────────────────────────────────────────────

export interface TryOnRequest {
  userId: string;
  productId: string;
  avatarGlbUrl: string;
  clothingGlbUrl: string;
}

export interface TryOnResult {
  id: string;
  userId: string;
  productId: string;
  renderUrl?: string;
  resultImage?: string; // used for favorites display
  originalImage?: string; // used for comparison slider
  outfit?: Outfit;      // linked outfit for favorites
  fitScore?: number;
  sizeRecommendation?: string;
  heatmapUrl?: string;
  aiAnalysis?: {
    confidence: number;
    size: string;
    suggestion: string;
  };
  status: 'ready' | 'error';
  error?: string;
}

// ─── Archetype / Morph Engine ────────────────────────────────────────────────

export interface Archetype {
  id: string;
  glbUrl: string;
  betas: number[]; // 10-dim SMPL-X shape params
  label?: string;
}

export interface MorphBlend {
  archetypeIds: string[];
  weights: number[];
}

// ─── Product / Marketplace ───────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  category: string;
  sizes: string[];
  images: string[];
  clothingGlbUrl?: string;
  tags?: string[];
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalAvatars: number;
  activeMarketplaces: number;
  tryOnsToday: number;
  avgFitScore: number;
  apiCallsThisMonth: number;
}

export interface ApiKeyRecord {
  id: string;
  marketplaceName: string;
  key: string; // masked in UI
  createdAt: string;
  lastUsed?: string;
  callCount: number;
  status: 'active' | 'revoked';
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export interface AvatarReadyWebhook {
  jobId: string;
  userId: string;
  status: AvatarStatus;
  glbPath?: string; // relative R2/S3 path
  error?: string;
  timestamp: string;
}




export type ProductCategory = 'clothing' | 'shoes' | 'hats' | 'jewelry' | 'bags' | 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'accessories';

export interface Outfit {
  id: string;
  name: string;
  brand?: string;
  price: number;
  imageUrl: string;
  category: ProductCategory;
}

export interface ClothingGlbApiResponse {
  glbUrl?: string;
  cached?: boolean;
  error?: string;
}

// ─── Direct API (Restoring Missing Types) ───────────────────────────────────

export interface ARSessionRequestBody {
  userId: string;
  productId: string;
}

export interface ARSessionResponse {
  sessionToken: string;
  message?: string;
}

export interface VideoTryOnStartResponse {
  jobId: string;
  status: string;
  message: string;
}

export type VideoJobStatus = 'processing' | 'completed' | 'failed';

export interface VideoJobStatusResponse {
  status: VideoJobStatus;
  progressPercent: number;
  resultVideoUrl: string | null;
  errorMessage: string | null;
}
