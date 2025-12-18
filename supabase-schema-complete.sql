-- Complete Supabase Schema with Authentication
-- Run this in Supabase SQL Editor

-- Create couples table
CREATE TABLE IF NOT EXISTS couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pets table
CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  pet_type TEXT NOT NULL CHECK (pet_type IN ('parrot', 'penguin', 'dog', 'cat', 'bunny', 'panda', 'fox', 'turtle', 'polar_bear')),
  pet_name TEXT,
  happiness INTEGER DEFAULT 50 CHECK (happiness >= 0 AND happiness <= 100),
  last_fed TIMESTAMPTZ DEFAULT NOW(),
  last_decay TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create memories table
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_couples_auth_user1 ON couples(auth_user1_id);
CREATE INDEX IF NOT EXISTS idx_couples_auth_user2 ON couples(auth_user2_id);
CREATE INDEX IF NOT EXISTS idx_couples_invite_code ON couples(invite_code);
CREATE INDEX IF NOT EXISTS idx_pets_couple_id ON pets(couple_id);
CREATE INDEX IF NOT EXISTS idx_notes_couple_id ON notes(couple_id);
CREATE INDEX IF NOT EXISTS idx_notes_auth_user ON notes(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_memories_couple_id ON memories(couple_id);
CREATE INDEX IF NOT EXISTS idx_memories_auth_user ON memories(auth_user_id);

-- Enable Row Level Security
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own couples" ON couples;
DROP POLICY IF EXISTS "Authenticated users can create couples" ON couples;
DROP POLICY IF EXISTS "Couple members can update their couple" ON couples;
DROP POLICY IF EXISTS "Couple members can view their pet" ON pets;
DROP POLICY IF EXISTS "Couple members can create their pet" ON pets;
DROP POLICY IF EXISTS "Couple members can update their pet" ON pets;
DROP POLICY IF EXISTS "Couple members can view their notes" ON notes;
DROP POLICY IF EXISTS "Authenticated users can create notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
DROP POLICY IF EXISTS "Couple members can view their memories" ON memories;
DROP POLICY IF EXISTS "Authenticated users can create memories" ON memories;
DROP POLICY IF EXISTS "Users can delete their own memories" ON memories;

-- RLS Policies for Couples Table
CREATE POLICY "Users can view their own couples"
  ON couples FOR SELECT
  USING (auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id);

CREATE POLICY "Authenticated users can create couples"
  ON couples FOR INSERT
  WITH CHECK (auth.uid() = auth_user1_id);

CREATE POLICY "Couple members can update their couple"
  ON couples FOR UPDATE
  USING (auth.uid() = auth_user1_id OR auth.uid() = auth_user2_id);

-- RLS Policies for Pets Table
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

-- RLS Policies for Notes Table
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

-- RLS Policies for Memories Table
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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_couples_updated_at ON couples;
CREATE TRIGGER update_couples_updated_at
  BEFORE UPDATE ON couples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pets_updated_at ON pets;
CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memories_updated_at ON memories;
CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
