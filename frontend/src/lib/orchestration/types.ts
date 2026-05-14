
export type ProviderType = 'tryon' | '3d-gen' | 'image-gen' | 'video-gen' | 'scoring';

export interface AIProvider {
  id: string;
  name: string;
  type: ProviderType;
  costPerCall: number;
  expectedLatencyMs: number;
  weight: number; // For load balancing
  enabled: boolean;
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
  qualityScore?: number;
  cost: number;
  error?: string;
  success: boolean;
}

export interface OrchestrationReport {
  timestamp: string;
  providerRouting: Record<string, number>; // providerId -> call count
  overallSuccessRate: number;
  avgLatency: number;
  costSaved: number;
}
