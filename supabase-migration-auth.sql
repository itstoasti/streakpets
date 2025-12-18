-- MIGRATION: Add Supabase Auth Support to Couples Pet App
-- This migration transitions from TEXT-based device IDs to UUID auth references
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add new UUID columns for authenticated users
-- ============================================================================

ALTER TABLE couples
  ADD COLUMN auth_user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN auth_user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE notes
  ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE memories
  ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 2: Create indexes for auth columns (performance optimization)
-- ============================================================================

CREATE INDEX idx_couples_auth_user1 ON couples(auth_user1_id);
CREATE INDEX idx_couples_auth_user2 ON couples(auth_user2_id);
CREATE INDEX idx_notes_auth_user ON notes(auth_user_id);
CREATE INDEX idx_memories_auth_user ON memories(auth_user_id);

-- ============================================================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS Policies for Couples Table
-- ============================================================================

-- Users can view couples where they are either user1 or user2
CREATE POLICY "Users can view their own couples"
  ON couples FOR SELECT
  USING (auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id);

-- Authenticated users can create couples (as user1)
CREATE POLICY "Authenticated users can create couples"
  ON couples FOR INSERT
  WITH CHECK (auth.uid() = auth_user1_id);

-- Couple members can update their couple (for pairing, pet selection, etc.)
CREATE POLICY "Couple members can update their couple"
  ON couples FOR UPDATE
  USING (auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id);

-- ============================================================================
-- STEP 5: Create RLS Policies for Pets Table
-- ============================================================================

-- Couple members can view their pet
CREATE POLICY "Couple members can view their pet"
  ON pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = pets.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- Couple members can create their pet
CREATE POLICY "Couple members can create their pet"
  ON pets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = pets.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- Couple members can update their pet
CREATE POLICY "Couple members can update their pet"
  ON pets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = pets.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- ============================================================================
-- STEP 6: Create RLS Policies for Notes Table
-- ============================================================================

-- Couple members can view all notes in their couple
CREATE POLICY "Couple members can view their notes"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = notes.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- Authenticated users can create notes for their couple
CREATE POLICY "Authenticated users can create notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Users can delete only their own notes
CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = auth_user_id);

-- ============================================================================
-- STEP 7: Create RLS Policies for Memories Table
-- ============================================================================

-- Couple members can view all memories in their couple
CREATE POLICY "Couple members can view their memories"
  ON memories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = memories.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- Authenticated users can create memories for their couple
CREATE POLICY "Authenticated users can create memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Users can delete only their own memories
CREATE POLICY "Users can delete their own memories"
  ON memories FOR DELETE
  USING (auth.uid() = auth_user_id);

-- ============================================================================
-- STEP 8: Ensure pet_name column exists and update pet_type constraint
-- ============================================================================

-- Add pet_name column if it doesn't exist
ALTER TABLE pets ADD COLUMN IF NOT EXISTS pet_name TEXT;

-- Update pet_type constraint to include all pet types
ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_pet_type_check;
ALTER TABLE pets ADD CONSTRAINT pets_pet_type_check
  CHECK (pet_type IN ('parrot', 'penguin', 'dog', 'cat', 'bunny', 'panda', 'fox', 'turtle', 'polar_bear'));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Next steps:
-- 1. Enable Email authentication in Supabase Dashboard (Authentication → Providers)
-- 2. Configure email templates (Authentication → Email Templates)
-- 3. Update app code to use auth_user1_id, auth_user2_id, auth_user_id columns
-- 4. After all users migrated, run cleanup migration to remove old TEXT columns
