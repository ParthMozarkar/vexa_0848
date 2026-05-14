// Uses in-memory store (upgrade to Redis for multi-instance deployments)
import { logger } from './logger';

const MAX_DAILY = parseInt(process.env.MAX_AI_CALLS_PER_USER_DAY ?? '20');
const MAX_BURST = 5;
const BURST_WINDOW_MS = 10_000;

// In-memory counters (per-process; for production use Redis)
const dailyCounters = new Map<string, { count: number; resetAt: number }>();
const burstCounters = new Map<string, { timestamps: number[] }>();

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'daily_limit' | 'burst_limit';
  resetAfterMs?: number;
}

export function checkAIRateLimit(userId: string): RateLimitResult {
  const now = Date.now();

  // Burst check: max MAX_BURST calls in BURST_WINDOW_MS
  const burst = burstCounters.get(userId) ?? { timestamps: [] };
  const recentBurst = burst.timestamps.filter((t) => now - t < BURST_WINDOW_MS);
  if (recentBurst.length >= MAX_BURST) {
    logger.warn('[AIRateLimit] Burst limit hit', { userId });
    return { allowed: false, reason: 'burst_limit', resetAfterMs: BURST_WINDOW_MS };
  }

  // Daily check
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const daily = dailyCounters.get(userId) ?? { count: 0, resetAt: midnight.getTime() };
  if (now > daily.resetAt) daily.count = 0; // Reset after midnight
  if (daily.count >= MAX_DAILY) {
    logger.warn('[AIRateLimit] Daily limit hit', { userId, count: daily.count });
    return { allowed: false, reason: 'daily_limit', resetAfterMs: daily.resetAt - now };
  }

  return { allowed: true };
}

export function incrementAIUsage(userId: string): void {
  const now = Date.now();

  // Increment burst
  const burst = burstCounters.get(userId) ?? { timestamps: [] };
  burst.timestamps = burst.timestamps.filter((t) => now - t < BURST_WINDOW_MS);
  burst.timestamps.push(now);
  burstCounters.set(userId, burst);

  // Increment daily
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const daily = dailyCounters.get(userId) ?? { count: 0, resetAt: midnight.getTime() };
  if (now > daily.resetAt) daily.count = 0;
  daily.count++;
  dailyCounters.set(userId, daily);
}
