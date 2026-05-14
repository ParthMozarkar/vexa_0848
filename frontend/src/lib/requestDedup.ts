import crypto from 'crypto';

const DEDUP_WINDOW_MS = 5_000;

interface InFlightEntry {
  promise: Promise<unknown>;
  expiresAt: number;
}

const inFlight = new Map<string, InFlightEntry>();

export function fingerprintRequest(userId: string, ...parts: string[]): string {
  return crypto
    .createHash('sha256')
    .update([userId, ...parts].join('|'))
    .digest('hex')
    .slice(0, 24);
}

export async function deduplicateRequest<T>(
  fingerprint: string,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const existing = inFlight.get(fingerprint);
  if (existing && existing.expiresAt > now) {
    return existing.promise as Promise<T>;
  }

  const promise = fn().finally(() => {
    setTimeout(() => inFlight.delete(fingerprint), 100);
  });

  inFlight.set(fingerprint, { promise, expiresAt: now + DEDUP_WINDOW_MS });
  return promise;
}
