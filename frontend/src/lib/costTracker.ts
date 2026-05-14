import { logger } from './logger';

export const PROVIDER_COSTS_USD: Record<string, number> = {
  TNB: parseFloat(process.env.COST_TNB_PER_CALL ?? '0.05'),
  OpenAI_image: parseFloat(process.env.COST_OPENAI_IMAGE_PER_CALL ?? '0.04'),
  OpenAI_text: parseFloat(process.env.COST_OPENAI_TEXT_PER_CALL ?? '0.01'),
  BlackBox: parseFloat(process.env.COST_BLACKBOX_PER_CALL ?? '0.02'),
};

export interface CostEntry {
  provider: string;
  endpoint: string;
  userId: string;
  estimatedCostUsd: number;
  timestamp: string;
  durationMs?: number;
}

export function trackProviderCall(entry: CostEntry): void {
  const cost =
    PROVIDER_COSTS_USD[entry.provider] ??
    PROVIDER_COSTS_USD[entry.provider.split('_')[0]] ??
    0;
  logger.info('[CostTracker]', {
    provider: entry.provider,
    endpoint: entry.endpoint,
    userId: entry.userId,
    estimatedCostUsd: cost,
    timestamp: entry.timestamp,
    durationMs: entry.durationMs,
  });
}

export function estimateCost(provider: string): number {
  return PROVIDER_COSTS_USD[provider] ?? 0;
}
