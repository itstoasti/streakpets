-- Fix RLS Policy for Joining Couples
-- Run this in Supabase SQL Editor AFTER the previous fix

-- Allow users to update unpaired couples to add themselves as partner
-- This lets the second user set themselves as auth_user2_id when joining
CREATE POLICY "Anyone can join unpaired couples"
  ON couples FOR UPDATE
  USING (auth_user2_id IS NULL)
  WITH CHECK (auth_user2_id = auth.uid());

-- This policy allows the second user to update the couple record
-- to add themselves as auth_user2_id, but ONLY if:
-- 1. The couple is currently unpaired (auth_user2_id IS NULL)
-- 2. They're setting auth_user2_id to their own user ID
