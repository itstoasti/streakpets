-- Cleanup Old Test Couples
-- Run this in Supabase SQL Editor to remove abandoned test couples

-- OPTION 1: Delete ALL couples for a specific user (CAREFUL!)
-- Replace 'USER_ID_HERE' with your actual user ID
-- DELETE FROM couples WHERE auth_user1_id = 'USER_ID_HERE' OR auth_user2_id = 'USER_ID_HERE';

-- OPTION 2: Delete couples without pets (abandoned/incomplete couples)
DELETE FROM couples
WHERE id IN (
  SELECT c.id
  FROM couples c
  LEFT JOIN pets p ON c.id = p.couple_id
  WHERE p.id IS NULL
  AND c.created_at < NOW() - INTERVAL '1 day'
);

-- OPTION 3: View all couples for a user to decide what to delete
-- Replace 'USER_ID_HERE' with your actual user ID
-- SELECT
--   c.*,
--   p.pet_name,
--   p.id as pet_id
-- FROM couples c
-- LEFT JOIN pets p ON c.id = p.couple_id
-- WHERE c.auth_user1_id = 'USER_ID_HERE' OR c.auth_user2_id = 'USER_ID_HERE'
-- ORDER BY c.created_at DESC;

-- The query above shows:
-- - All couples you're in
-- - Whether they have pets (pet_name will be NULL if no pet)
-- - You can then manually delete specific couples:
--   DELETE FROM pets WHERE couple_id = 'COUPLE_ID_HERE';
--   DELETE FROM couples WHERE id = 'COUPLE_ID_HERE';
