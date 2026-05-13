-- 002_usage_logs_align.sql
-- Add columns expected by Next.js middleware, AR session logging, and dashboard analytics.
-- Prerequisite: table `usage_logs` already exists (see frontend/supabase/usage_logs.sql).

ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status INTEGER,
  ADD COLUMN IF NOT EXISTS response_time_ms INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS status_code INTEGER,
  ADD COLUMN IF NOT EXISTS product_id TEXT;

CREATE INDEX IF NOT EXISTS usage_logs_api_key_id_idx ON usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS usage_logs_timestamp_idx ON usage_logs("timestamp");
