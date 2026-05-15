-- Temporary asset store for images that cannot be persisted to R2/Storage.
-- Used as a last-resort fallback by /api/serve/[id] so TNB (and other AI APIs)
-- can always fetch a public HTTP URL even when blob storage is not configured.

CREATE TABLE IF NOT EXISTS temp_assets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  data       TEXT        NOT NULL,          -- base64-encoded image bytes
  mime_type  TEXT        NOT NULL DEFAULT 'image/png',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow public reads for unexpired rows (service role bypasses RLS for writes)
ALTER TABLE temp_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "temp_assets_public_read" ON temp_assets;
CREATE POLICY "temp_assets_public_read"
  ON temp_assets FOR SELECT
  USING (expires_at > NOW());

-- Clean up expired rows automatically (requires pg_cron on paid plans;
-- safe to skip — rows are tiny and the serve route checks expiry anyway)
