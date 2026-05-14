// SLA target constants and health check aggregator.

export const SLA_TARGETS = {
  uptimePercent: 99.9,
  p99LatencyMs: {
    tryon: 15_000,
    upload: 5_000,
    avatar: 300_000, // async job
    design: 30_000,
  },
  errorRatePercent: 1.0,
  recoveryTimeObjectiveMin: 30,
  recoveryPointObjectiveHours: 24,
} as const;

export interface HealthSummary {
  healthy: boolean;
  checks: {
    api: boolean;
    redis: boolean;
    database: boolean;
    storage: boolean;
  };
  timestamp: string;
}

export async function getHealthSummary(): Promise<HealthSummary> {
  const checks = {
    api: true,
    redis: !!process.env.REDIS_URL,
    database: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    storage: !!(process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID),
  };

  return {
    healthy: Object.values(checks).every(Boolean),
    checks,
    timestamp: new Date().toISOString(),
  };
}
