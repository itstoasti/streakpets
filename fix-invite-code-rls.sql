-- Fix RLS Policy for Invite Code Joining
-- Run this in Supabase SQL Editor

-- Add policy to allow any authenticated user to view unpaired couples
-- (couples where auth_user2_id is NULL, meaning they're looking for a partner)
CREATE POLICY "Anyone can view unpaired couples for joining"
  ON couples FOR SELECT
  USING (auth_user2_id IS NULL);

-- This allows the second user to search for and find couples by invite_code
-- when trying to join, while still protecting fully-paired couples
