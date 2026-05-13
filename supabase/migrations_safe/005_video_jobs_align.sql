-- 005_video_jobs_align.sql

CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  input_video_url TEXT NOT NULL,
  product_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  progress_percent INTEGER DEFAULT 0,
  result_video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

ALTER TABLE video_jobs
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS result_video_url TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;
