// Cache utility — Redis-backed with in-memory LRU fallback
// Install: npm install ioredis (for Redis backend)
import crypto from 'crypto';

// Simple LRU cache for in-memory fallback
class LRUCache<T> {
  private map = new Map<string, { value: T; expiresAt: number }>();
  constructor(private maxSize = 500) {}

  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    // Move to end (most recent)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds: number): void {
    if (this.map.size >= this.maxSize) {
      // Evict oldest
      const firstKey = this.map.keys().next().value;
      if (firstKey) this.map.delete(firstKey);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}

const lru = new LRUCache<string>(500);

// Minimal interface for the Redis operations we use — avoids a hard dependency on ioredis types.
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, exFlag: 'EX', ttlSeconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

function getRedis(): RedisClient | null {
  if (!process.env.REDIS_URL) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require('ioredis') as {
      new (url: string, opts: Record<string, unknown>): RedisClient;
    };
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  } catch {
    return null;
  }
}

let _redis: RedisClient | null | undefined;
function redis(): RedisClient | null {
  if (_redis === undefined) _redis = getRedis();
  return _redis;
}

export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      const r = redis();
      if (r) return await r.get(key);
    } catch {
      /* fall through to LRU */
    }
    return lru.get(key);
  },

  async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    try {
      const r = redis();
      if (r) {
        await r.set(key, value, 'EX', ttlSeconds);
        return;
      }
    } catch {
      /* fall through to LRU */
    }
    lru.set(key, value, ttlSeconds);
  },

  async del(key: string): Promise<void> {
    try {
      const r = redis();
      if (r) await r.del(key);
    } catch {
      /* no-op */
    }
    lru.delete(key);
  },
};

export function hashInputs(...parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

export const CACHE_TTL = {
  IMAGE_RESOLUTION: 3600, // 1 hour
  GENERATION_RESULT: 86400, // 24 hours
  PROVIDER_RESPONSE: 86400, // 24 hours
  UPLOAD_DEDUP: 86400 * 7, // 7 days
} as const;

// Cache key namespaces
export const CACHE_KEYS = {
  imageResolution: (url: string) => `img:${hashInputs(url)}`,
  generationResult: (personUrl: string, garmentUrl: string, category: string) =>
    `gen:${hashInputs(personUrl, garmentUrl, category)}`,
  providerResponse: (provider: string, inputHash: string) => `prov:${provider}:${inputHash}`,
  uploadDedup: (contentHash: string) => `upload:${contentHash}`,
};

export function shouldBypassCache(req: {
  headers: { get: (k: string) => string | null };
}): boolean {
  return req.headers.get('x-cache-bypass') === 'true';
}
