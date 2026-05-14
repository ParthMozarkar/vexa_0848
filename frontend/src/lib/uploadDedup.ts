import crypto from 'crypto';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';

export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function getCachedUploadUrl(buffer: Buffer): Promise<string | null> {
  const contentHash = hashBuffer(buffer);
  return cache.get(CACHE_KEYS.uploadDedup(contentHash));
}

export async function setCachedUploadUrl(buffer: Buffer, url: string): Promise<void> {
  const contentHash = hashBuffer(buffer);
  await cache.set(CACHE_KEYS.uploadDedup(contentHash), url, CACHE_TTL.UPLOAD_DEDUP);
}
