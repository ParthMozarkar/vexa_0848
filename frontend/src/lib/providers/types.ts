export type ProviderCapability = 'tryon' | 'tryon-video' | 'design' | 'model-gen' | 'trends';

export interface ProviderCallOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ProviderHealthResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

export interface AIProvider<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly capabilities: ProviderCapability[];
  call(input: TInput, options?: ProviderCallOptions): Promise<TOutput>;
  healthCheck(): Promise<ProviderHealthResult>;
}
