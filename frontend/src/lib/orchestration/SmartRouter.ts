
import { AIProvider, RoutingConfig, ProviderMetrics } from './types';
import { getProvidersByType } from './ProviderRegistry';

export class SmartRouter {
  private static metrics: Map<string, ProviderMetrics> = new Map();

  static async selectProvider(
    type: AIProvider['type'],
    config: RoutingConfig
  ): Promise<AIProvider> {
    const providers = getProvidersByType(type);
    
    if (providers.length === 0) {
      throw new Error(`No providers available for type: ${type}`);
    }

    // Rank providers based on config
    const ranked = providers.sort((a, b) => {
      const metricsA = this.metrics.get(a.id);
      const metricsB = this.metrics.get(b.id);

      let scoreA = 0;
      let scoreB = 0;

      // Base score on historical success rate if available
      if (metricsA) scoreA += metricsA.successRate * 10;
      if (metricsB) scoreB += metricsB.successRate * 10;

      if (config.preferCost) {
        scoreA += (1 / a.costPerCall) * 5;
        scoreB += (1 / b.costPerCall) * 5;
      }

      if (config.preferLatency) {
        const latA = metricsA?.avgLatencyMs || a.expectedLatencyMs;
        const latB = metricsB?.avgLatencyMs || b.expectedLatencyMs;
        scoreA += (1 / latA) * 10000;
        scoreB += (1 / latB) * 10000;
      }

      return scoreB - scoreA; // Higher score wins
    });

    return ranked[0];
  }

  static updateMetrics(providerId: string, success: boolean, latencyMs: number, qualityScore?: number) {
    const current = this.metrics.get(providerId) || {
      providerId,
      successRate: 1,
      avgLatencyMs: 0,
      lastUsed: new Date().toISOString(),
      errorCount: 0,
      qualityScore: 0,
    };

    // Simple moving average for metrics
    const alpha = 0.2;
    current.successRate = success ? (current.successRate * (1 - alpha) + alpha) : (current.successRate * (1 - alpha));
    current.avgLatencyMs = current.avgLatencyMs === 0 ? latencyMs : (current.avgLatencyMs * (1 - alpha) + latencyMs * alpha);
    if (qualityScore !== undefined) {
      current.qualityScore = current.qualityScore === 0 ? qualityScore : (current.qualityScore * (1 - alpha) + qualityScore * alpha);
    }
    if (!success) current.errorCount++;
    current.lastUsed = new Date().toISOString();

    this.metrics.set(providerId, current);
  }

  static getAllMetrics(): ProviderMetrics[] {
    return Array.from(this.metrics.values());
  }
}
