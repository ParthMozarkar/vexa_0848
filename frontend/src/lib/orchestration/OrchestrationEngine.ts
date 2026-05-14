
import { SmartRouter } from './SmartRouter';
import { AIProvider, RoutingConfig, GenerationResult } from './types';

export class OrchestrationEngine {
  private static defaultConfig: RoutingConfig = {
    preferCost: false,
    preferLatency: true,
    minQualityScore: 70,
    retryAttempts: 2,
    timeoutMs: 120000,
  };

  /**
   * Orchestrates an AI generation task with smart routing and persistent metrics.
   */
  static async execute(
    type: AIProvider['type'],
    payload: any,
    config: Partial<RoutingConfig> = {}
  ): Promise<GenerationResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let attempts = 0;
    const startTime = Date.now();

    while (attempts <= finalConfig.retryAttempts) {
      attempts++;
      const provider = await SmartRouter.selectProvider(type, finalConfig);
      const callStart = Date.now();

      try {
        console.log(`[Orchestration] Executing ${type} via ${provider.name} (Attempt ${attempts}/${finalConfig.retryAttempts + 1})`);
        
        const outputUrl = await provider.call(payload, { timeoutMs: finalConfig.timeoutMs });
        const latencyMs = Date.now() - callStart;

        // Persist metrics
        await SmartRouter.updateMetrics(provider.id, true, latencyMs);

        return {
          providerId: provider.id,
          outputUrl,
          latencyMs,
          cost: provider.costPerCall,
          success: true,
        };
      } catch (error: any) {
        const latencyMs = Date.now() - callStart;
        console.error(`[Orchestration] Provider ${provider.name} failed:`, error.message);
        
        // Log failure to Redis
        await SmartRouter.updateMetrics(provider.id, false, latencyMs);
        
        if (attempts > finalConfig.retryAttempts) {
          return {
            providerId: provider.id,
            outputUrl: '',
            latencyMs,
            cost: 0,
            success: false,
            error: error.message,
          };
        }
        // Small delay before retry
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }

    throw new Error('Orchestration failed after exhaustion of providers and retries');
  }
}
