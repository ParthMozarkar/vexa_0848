
import { SmartRouter } from './SmartRouter';
import { QualityScorer } from './QualityScorer';
import { AIProvider, RoutingConfig, GenerationResult } from './types';

export class OrchestrationEngine {
  private static defaultConfig: RoutingConfig = {
    preferCost: false,
    preferLatency: true,
    minQualityScore: 75,
    retryAttempts: 2,
    timeoutMs: 30000,
  };

  static async executeWithOrchestration(
    type: AIProvider['type'],
    payload: any,
    executeFn: (provider: AIProvider, data: any) => Promise<string>,
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
        console.log(`[Orchestration] Attempt ${attempts} using provider: ${provider.name}`);
        
        const outputUrl = await executeFn(provider, payload);
        const latencyMs = Date.now() - callStart;

        // Quality Scoring
        const scoring = await QualityScorer.scoreGeneration(outputUrl, JSON.stringify(payload));
        
        const result: GenerationResult = {
          providerId: provider.id,
          outputUrl,
          latencyMs,
          qualityScore: scoring.score,
          cost: provider.costPerCall,
          success: true,
        };

        // Validate
        if (QualityScorer.validateOutput(result, finalConfig.minQualityScore)) {
          SmartRouter.updateMetrics(provider.id, true, latencyMs, scoring.score);
          return result;
        } else {
          console.warn(`[Orchestration] Quality too low (${scoring.score}), retrying...`);
          SmartRouter.updateMetrics(provider.id, true, latencyMs, scoring.score); // Still a success but low quality
        }
      } catch (error: any) {
        const latencyMs = Date.now() - callStart;
        console.error(`[Orchestration] Provider ${provider.name} failed:`, error.message);
        SmartRouter.updateMetrics(provider.id, false, latencyMs);
        
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
      }
    }

    throw new Error('Orchestration failed after maximum retries');
  }
}
