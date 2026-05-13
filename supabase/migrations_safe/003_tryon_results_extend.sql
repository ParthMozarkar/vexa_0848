-- 003_tryon_results_extend.sql

ALTER TABLE tryon_results
  ADD COLUMN IF NOT EXISTS user_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS garment_url TEXT;
