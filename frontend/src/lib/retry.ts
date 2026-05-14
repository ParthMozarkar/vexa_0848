export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

export class RetryExhaustedError extends Error {
  constructor(
    public readonly lastError: Error,
    public readonly attempts: number,
  ) {
    super(`Retry exhausted after ${attempts} attempts: ${lastError.message}`);
    this.name = 'RetryExhaustedError';
  }
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    jitter = true,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxAttempts || !shouldRetry(lastError, attempt)) {
        throw new RetryExhaustedError(lastError, attempt);
      }
      const exponential = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const delay = jitter ? exponential * (0.5 + Math.random() * 0.5) : exponential;
      onRetry?.(lastError, attempt, delay);
      await sleep(delay);
    }
  }

  throw new RetryExhaustedError(lastError, maxAttempts);
}

function defaultShouldRetry(error: Error, _attempt: number): boolean {
  const msg = error.message.toLowerCase();
  if (msg.includes('401') || msg.includes('403') || msg.includes('invalid api key')) return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function makeRateLimitAwareOptions(base: RetryOptions = {}): RetryOptions {
  return {
    maxAttempts: 3,
    baseDelayMs: 1000,
    ...base,
    shouldRetry: (error, attempt) => {
      if (error.message.includes('401') || error.message.includes('403')) return false;
      return attempt < (base.maxAttempts ?? 3);
    },
  };
}
