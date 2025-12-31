-- Step 1: DIAGNOSE - Run this first to see what policies currently exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'couples'
ORDER BY policyname;

-- After running the above, you'll see all policies
-- Then run the fix below

-- ============================================
-- Step 2: NUCLEAR OPTION FIX
-- ============================================
-- This removes ALL policies and creates minimal ones
-- that definitely work for leaving couples

-- Drop EVERYTHING
DROP POLICY IF EXISTS "Users can view their own couples" ON couples;
DROP POLICY IF EXISTS "Authenticated users can create couples" ON couples;
DROP POLICY IF EXISTS "Couple members can update their couple" ON couples;
DROP POLICY IF EXISTS "Anyone can view unpaired couples for joining" ON couples;
DROP POLICY IF EXISTS "Anyone can join unpaired couples" ON couples;
DROP POLICY IF EXISTS "Non-members can join unpaired couples" ON couples;
DROP POLICY IF EXISTS "Couple creators can delete their couple" ON couples;

-- Also drop any policies created during migration
DROP POLICY IF EXISTS "Couple members can view their couple" ON couples;
DROP POLICY IF EXISTS "Members can update couple" ON couples;
DROP POLICY IF EXISTS "Users can update their couples" ON couples;

-- SELECT: View your own couples
CREATE POLICY "select_own_couples"
  ON couples FOR SELECT
  USING (auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id);

-- SELECT: View unpaired couples (needed for joining)
CREATE POLICY "select_unpaired_couples"
  ON couples FOR SELECT
  USING (auth_user2_id IS NULL);

-- INSERT: Create couples
CREATE POLICY "insert_couples"
  ON couples FOR INSERT
  WITH CHECK (auth.uid() = auth_user1_id);

-- UPDATE: The critical one - ABSOLUTELY NO WITH CHECK
-- This allows members to do ANY update including leaving
CREATE POLICY "update_couples"
  ON couples FOR UPDATE
  USING (
    auth.uid() = auth_user1_id
    OR auth.uid() = auth_user2_id
    OR auth_user2_id IS NULL
  );
  -- NO WITH CHECK = allows any update result

-- DELETE: Only User 1 can delete
CREATE POLICY "delete_couples"
  ON couples FOR DELETE
  USING (auth.uid() = auth_user1_id);
