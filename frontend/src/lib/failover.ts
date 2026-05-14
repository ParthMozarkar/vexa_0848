import { withRetry, RetryExhaustedError, type RetryOptions } from './retry';
import type { AIProvider, ProviderCapability } from './providers/types';
import { getProviders } from './providers/registry';

export interface FailoverOptions {
  retryOptions?: RetryOptions;
  timeoutMs?: number;
}

export interface FailoverResult<T> {
  data: T;
  provider: string;
  attempts: number;
  usedFallback: boolean;
}

export interface FailoverError {
  error: string;
  retryAfter: number;
  fallbackAvailable: false;
  providersAttempted: string[];
}

export async function callWithFailover<TInput, TOutput>(
  capability: ProviderCapability,
  input: TInput,
  options: FailoverOptions = {},
): Promise<FailoverResult<TOutput>> {
  const providers = getProviders(capability) as AIProvider<TInput, TOutput>[];

  if (providers.length === 0) {
    const err: FailoverError = {
      error: `No providers registered for capability: ${capability}`,
      retryAfter: 60,
      fallbackAvailable: false,
      providersAttempted: [],
    };
    throw err;
  }

  const attempted: string[] = [];
  let totalAttempts = 0;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    attempted.push(provider.name);

    try {
      const data = await withRetry(
        () => {
          const signal = options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined;
          return provider.call(input, { signal, timeoutMs: options.timeoutMs });
        },
        options.retryOptions ?? { maxAttempts: 3, baseDelayMs: 1000 },
      );
      totalAttempts++;
      return { data, provider: provider.name, attempts: totalAttempts, usedFallback: i > 0 };
    } catch (err) {
      totalAttempts += err instanceof RetryExhaustedError ? err.attempts : 1;
      // continue to next provider
    }
  }

  const failoverErr: FailoverError = {
    error: `All providers exhausted for capability: ${capability}`,
    retryAfter: 60,
    fallbackAvailable: false,
    providersAttempted: attempted,
  };
  throw failoverErr;
}
