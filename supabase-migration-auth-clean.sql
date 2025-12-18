ALTER TABLE couples
  ADD COLUMN auth_user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN auth_user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE notes
  ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE memories
  ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_couples_auth_user1 ON couples(auth_user1_id);
CREATE INDEX idx_couples_auth_user2 ON couples(auth_user2_id);
CREATE INDEX idx_notes_auth_user ON notes(auth_user_id);
CREATE INDEX idx_memories_auth_user ON memories(auth_user_id);

ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own couples"
  ON couples FOR SELECT
  USING (auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id);

CREATE POLICY "Authenticated users can create couples"
  ON couples FOR INSERT
  WITH CHECK (auth.uid() = auth_user1_id);

CREATE POLICY "Couple members can update their couple"
  ON couples FOR UPDATE
  USING (auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id);

CREATE POLICY "Couple members can view their pet"
  ON pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = pets.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can create their pet"
  ON pets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = pets.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can update their pet"
  ON pets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = pets.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can view their notes"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = notes.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Couple members can view their memories"
  ON memories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = memories.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete their own memories"
  ON memories FOR DELETE
  USING (auth.uid() = auth_user_id);

ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_pet_type_check;
ALTER TABLE pets ADD CONSTRAINT pets_pet_type_check
  CHECK (pet_type IN ('parrot', 'penguin', 'dog', 'cat', 'bunny', 'panda', 'fox', 'turtle', 'polar_bear'));

ALTER TABLE pets ADD COLUMN IF NOT EXISTS pet_name TEXT;
