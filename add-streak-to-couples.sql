-- Add streak tracking to couples table (shared between partners)
-- Run this in Supabase SQL Editor

ALTER TABLE couples
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_couples_last_activity ON couples(last_activity_date);
