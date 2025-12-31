-- Add push token columns to couples table
-- Run this in Supabase SQL Editor

ALTER TABLE couples
ADD COLUMN IF NOT EXISTS user1_push_token TEXT,
ADD COLUMN IF NOT EXISTS user2_push_token TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_couples_user1_push_token ON couples(user1_push_token);
CREATE INDEX IF NOT EXISTS idx_couples_user2_push_token ON couples(user2_push_token);

-- Add comments for documentation
COMMENT ON COLUMN couples.user1_push_token IS 'Expo push notification token for user 1 (couple creator)';
COMMENT ON COLUMN couples.user2_push_token IS 'Expo push notification token for user 2 (couple joiner)';
