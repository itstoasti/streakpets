-- Fix RLS policies for games table to allow realtime subscriptions
-- The issue is that RLS policies need to be compatible with realtime

-- First, let's check if the policies exist
-- You can see them in Supabase Dashboard > Authentication > Policies > games table

-- Drop existing policies (we'll recreate them)
DROP POLICY IF EXISTS "Couple members can view their games" ON games;
DROP POLICY IF EXISTS "Couple members can create games" ON games;
DROP POLICY IF EXISTS "Couple members can update their games" ON games;
DROP POLICY IF EXISTS "Couple members can delete their games" ON games;

-- Recreate policies that work with realtime
-- Important: Use auth.uid() which is available in realtime context

CREATE POLICY "Couple members can view their games"
  ON games FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE auth_user1_id = auth.uid() OR auth_user2_id = auth.uid()
    )
  );

CREATE POLICY "Couple members can create games"
  ON games FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples
      WHERE auth_user1_id = auth.uid() OR auth_user2_id = auth.uid()
    )
  );

CREATE POLICY "Couple members can update their games"
  ON games FOR UPDATE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE auth_user1_id = auth.uid() OR auth_user2_id = auth.uid()
    )
  );

CREATE POLICY "Couple members can delete their games"
  ON games FOR DELETE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE auth_user1_id = auth.uid() OR auth_user2_id = auth.uid()
    )
  );
