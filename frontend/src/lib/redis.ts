// Install: npm install ioredis
// Gracefully degrades if REDIS_URL not set (returns null client)

interface RedisLike {
  on(event: string, handler: (err: Error) => void): void;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ex: 'EX', ttl: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

let _client: RedisLike | null = null;

export function getRedisClient(): RedisLike | null {
  if (!process.env.REDIS_URL) return null;
  if (_client) return _client;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require('ioredis') as { new (url: string, opts: Record<string, unknown>): RedisLike };
    _client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    _client.on('error', (err: Error) => {
      console.warn('[Redis] Connection error:', err.message);
    });
    return _client;
  } catch {
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return !!process.env.REDIS_URL;
}
