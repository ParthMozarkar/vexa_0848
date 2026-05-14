import { cache, CACHE_KEYS, CACHE_TTL } from './cache';

export async function getCachedGenerationResult(
  personUrl: string,
  garmentUrl: string,
  category: string,
): Promise<string | null> {
  return cache.get(CACHE_KEYS.generationResult(personUrl, garmentUrl, category));
}

export async function setCachedGenerationResult(
  personUrl: string,
  garmentUrl: string,
  category: string,
  resultUrl: string,
): Promise<void> {
  await cache.set(
    CACHE_KEYS.generationResult(personUrl, garmentUrl, category),
    resultUrl,
    CACHE_TTL.GENERATION_RESULT,
  );
}
