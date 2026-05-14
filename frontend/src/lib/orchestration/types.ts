
export type ProviderType = 'tryon' | '3d-gen' | 'image-gen' | 'video-gen' | 'design' | 'trends' | 'scoring';

export interface AIProvider {
  id: string;
  name: string;
  type: ProviderType;
  costPerCall: number;
  expectedLatencyMs: number;
  weight: number; 
  enabled: boolean;
  call(payload: any, options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<string>;
}

export interface RoutingConfig {
  preferCost: boolean;
  preferLatency: boolean;
  minQualityScore: number;
  retryAttempts: number;
  timeoutMs: number;
}

export interface ProviderMetrics {
  providerId: string;
  successRate: number;
  avgLatencyMs: number;
  lastUsed: string;
  errorCount: number;
  qualityScore: number;
}

export interface GenerationResult {
  providerId: string;
  outputUrl: string;
  latencyMs: number;
  cost: number;
  error?: string;
  success: boolean;
}
