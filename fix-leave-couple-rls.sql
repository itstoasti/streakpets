-- Fix RLS Policy to Allow Users to Leave Couples
-- Run this in Supabase SQL Editor

-- Drop the existing update policy
DROP POLICY IF EXISTS "Couple members can update their couple" ON couples;

-- Create a simpler policy that allows updates based on current membership
-- This allows User 2 to set auth_user2_id to NULL (leaving the couple)
CREATE POLICY "Couple members can update their couple"
  ON couples FOR UPDATE
  USING (auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id);

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Couple creators can delete their couple" ON couples;

-- Allow User 1 (creator) to delete the entire couple
CREATE POLICY "Couple creators can delete their couple"
  ON couples FOR DELETE
  USING (auth.uid() = auth_user1_id);
