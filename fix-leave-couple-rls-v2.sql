-- Fix RLS Policy to Allow Users to Leave Couples - Version 2
-- Run this in Supabase SQL Editor

-- First, let's see what policies exist
-- Run this first to check current policies:
-- SELECT * FROM pg_policies WHERE tablename = 'couples';

-- Drop ALL existing policies on couples table to start fresh
DROP POLICY IF EXISTS "Users can view their own couples" ON couples;
DROP POLICY IF EXISTS "Authenticated users can create couples" ON couples;
DROP POLICY IF EXISTS "Couple members can update their couple" ON couples;
DROP POLICY IF EXISTS "Anyone can view unpaired couples for joining" ON couples;
DROP POLICY IF EXISTS "Anyone can join unpaired couples" ON couples;
DROP POLICY IF EXISTS "Non-members can join unpaired couples" ON couples;
DROP POLICY IF EXISTS "Couple creators can delete their couple" ON couples;

-- Recreate SELECT policy (viewing couples)
CREATE POLICY "Users can view their own couples"
  ON couples FOR SELECT
  USING (auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id);

-- Policy to view unpaired couples (for joining)
CREATE POLICY "Anyone can view unpaired couples for joining"
  ON couples FOR SELECT
  USING (auth_user2_id IS NULL);

-- Recreate INSERT policy (creating couples)
CREATE POLICY "Authenticated users can create couples"
  ON couples FOR INSERT
  WITH CHECK (auth.uid() = auth_user1_id);

-- IMPORTANT: We need TWO separate update policies that are mutually exclusive
-- Policy 1: For members updating/leaving (includes User 2 leaving)
-- Policy 2: For non-members joining

-- UPDATE POLICY #1: For existing couple members (including leaving)
-- Applies when user IS currently a member
-- No WITH CHECK - allows any update including leaving (setting to NULL)
CREATE POLICY "Couple members can update their couple"
  ON couples FOR UPDATE
  USING (
    -- User must be a current member
    auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id
  );
  -- No WITH CHECK clause = allows User 2 to set themselves to NULL

-- UPDATE POLICY #2: For joining unpaired couples
-- Applies when user is NOT a member and couple has no User 2
-- Has WITH CHECK to ensure they're setting themselves as User 2
CREATE POLICY "Non-members can join unpaired couples"
  ON couples FOR UPDATE
  USING (
    -- Couple must be unpaired AND user not already a member
    auth_user2_id IS NULL
    AND auth.uid() != auth_user1_id
  )
  WITH CHECK (
    -- After update, user must be User 2
    auth.uid() = auth_user2_id
  );

-- Recreate DELETE policy (deleting couples)
CREATE POLICY "Couple creators can delete their couple"
  ON couples FOR DELETE
  USING (auth.uid() = auth_user1_id);
