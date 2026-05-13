-- 006_increment_ip_usage.sql
-- Optional RPC consumed by frontend/src/lib/rateLimit.ts (best-effort).

CREATE OR REPLACE FUNCTION increment_ip_usage(p_ip TEXT, p_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ip_usage_limits
  SET count = count + 1
  WHERE ip_address = p_ip AND usage_type = p_type;
END;
$$;
