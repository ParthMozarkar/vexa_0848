-- 001_ip_usage_limits.sql
-- IP-based limits for public try-on / design (matches frontend/src/lib/ipRateLimit.ts)

CREATE TABLE IF NOT EXISTS ip_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('tryon', 'design')),
  count INTEGER NOT NULL DEFAULT 0,
  last_reset TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT ip_usage_limits_ip_type_unique UNIQUE (ip_address, usage_type)
);

CREATE INDEX IF NOT EXISTS idx_ip_usage_limits_ip ON ip_usage_limits(ip_address);
