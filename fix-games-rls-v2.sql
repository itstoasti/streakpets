-- Fix RLS policies for games table - Version 2
-- The previous version was too restrictive

-- Drop existing policies
DROP POLICY IF EXISTS "Couple members can view their games" ON games;
DROP POLICY IF EXISTS "Couple members can create games" ON games;
DROP POLICY IF EXISTS "Couple members can update their games" ON games;
DROP POLICY IF EXISTS "Couple members can delete their games" ON games;

-- Create simpler, more permissive policies that work with realtime

-- SELECT: Allow users to see games for their couple
CREATE POLICY "Couple members can view their games"
  ON games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = games.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- INSERT: Allow users to create games for their couple
CREATE POLICY "Couple members can create games"
  ON games FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = games.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- UPDATE: Allow users to update games for their couple
CREATE POLICY "Couple members can update their games"
  ON games FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = games.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = games.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- DELETE: Allow users to delete games for their couple
CREATE POLICY "Couple members can delete their games"
  ON games FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = games.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- Grant necessary permissions
GRANT ALL ON games TO authenticated;
GRANT ALL ON games TO anon;
