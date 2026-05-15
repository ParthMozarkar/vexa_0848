
import { AIProvider, RoutingConfig, ProviderMetrics } from './types';
import { getProvidersByType } from './ProviderRegistry';
import { getUpstashClient } from '@/lib/upstash';

const METRICS_TTL = 86400 * 7; // 7 days

export class SmartRouter {
  private static METRICS_KEY_PREFIX = 'vexa:metrics:v1:';
  private static metricsCache = new Map<string, ProviderMetrics>();

  static getAllMetrics(): ProviderMetrics[] {
    return Array.from(this.metricsCache.values());
  }

  static async selectProvider(
    type: AIProvider['type'],
    config: RoutingConfig
  ): Promise<AIProvider> {
    const providers = getProvidersByType(type);
    if (providers.length === 0) throw new Error(`No providers for ${type}`);

    const redis = getUpstashClient();
    let metricsData: Record<string, ProviderMetrics> = {};

    if (redis) {
      try {
        const keys = providers.map(p => `${this.METRICS_KEY_PREFIX}${p.id}`);
        const results = await redis.mget<ProviderMetrics[]>(...keys);
        results.forEach((m, i) => {
          if (m) metricsData[providers[i].id] = m;
        });
      } catch (err) {
        console.warn('[SmartRouter] Redis error, falling back to weights:', err);
      }
    }

    const ranked = providers.sort((a, b) => {
      const mA = metricsData[a.id];
      const mB = metricsData[b.id];

      let scoreA = a.weight * 100;
      let scoreB = b.weight * 100;

      // Quality adjustment
      if (mA) scoreA += (mA.successRate * 50) + (mA.qualityScore / 2);
      if (mB) scoreB += (mB.successRate * 50) + (mB.qualityScore / 2);

      // Latency adjustment
      if (config.preferLatency) {
        const latA = mA?.avgLatencyMs || a.expectedLatencyMs;
        const latB = mB?.avgLatencyMs || b.expectedLatencyMs;
        scoreA -= (latA / 100);
        scoreB -= (latB / 100);
      }

      return scoreB - scoreA;
    });

    return ranked[0];
  }

  static async updateMetrics(providerId: string, success: boolean, latencyMs: number, qualityScore?: number) {
    const redis = getUpstashClient();
    if (!redis) return;

    try {
      const key = `${this.METRICS_KEY_PREFIX}${providerId}`;
      const current: ProviderMetrics = (await redis.get<ProviderMetrics>(key)) || {
        providerId,
        successRate: 1,
        avgLatencyMs: 0,
        lastUsed: new Date().toISOString(),
        errorCount: 0,
        qualityScore: 75,
      };

      const alpha = 0.2;
      current.successRate = success 
        ? (current.successRate * (1 - alpha) + alpha) 
        : (current.successRate * (1 - alpha));
      
      current.avgLatencyMs = current.avgLatencyMs === 0 
        ? latencyMs 
        : (current.avgLatencyMs * (1 - alpha) + latencyMs * alpha);
      
      if (qualityScore !== undefined) {
        current.qualityScore = (current.qualityScore * (1 - alpha) + qualityScore * alpha);
      }
      
      if (!success) current.errorCount++;
      current.lastUsed = new Date().toISOString();
      this.metricsCache.set(providerId, current);

      await redis.set(key, current, { ex: METRICS_TTL });
    } catch (err) {
      console.warn('[SmartRouter] Failed to update metrics:', err);
    }
  }
}
