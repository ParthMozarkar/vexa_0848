-- 004_bookings.sql

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  platform TEXT DEFAULT '',
  message TEXT DEFAULT '',
  slot_date DATE,
  slot_time TEXT,
  company_size TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bookings_slot_date ON bookings(slot_date);
