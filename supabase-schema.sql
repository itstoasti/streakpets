-- Couples Pet App - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Couples Table
CREATE TABLE IF NOT EXISTS couples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pets Table
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    pet_type TEXT NOT NULL CHECK (pet_type IN ('parrot', 'dog', 'penguin')),
    happiness INTEGER NOT NULL DEFAULT 50 CHECK (happiness >= 0 AND happiness <= 100),
    last_fed TIMESTAMP WITH TIME ZONE,
    last_decay TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(couple_id)
);

-- Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memories Table
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_couples_user1 ON couples(user1_id);
CREATE INDEX IF NOT EXISTS idx_couples_user2 ON couples(user2_id);
CREATE INDEX IF NOT EXISTS idx_couples_invite_code ON couples(invite_code);
CREATE INDEX IF NOT EXISTS idx_pets_couple ON pets(couple_id);
CREATE INDEX IF NOT EXISTS idx_notes_couple ON notes(couple_id);
CREATE INDEX IF NOT EXISTS idx_memories_couple ON memories(couple_id);

-- Enable Row Level Security (RLS)
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Couples
CREATE POLICY "Users can view their own couples"
    ON couples FOR SELECT
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create couples"
    ON couples FOR INSERT
    WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update their own couples"
    ON couples FOR UPDATE
    USING (auth.uid() = user1_id OR auth.uid() = user2_id)
    WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for Pets
CREATE POLICY "Couple members can view their pet"
    ON pets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM couples
            WHERE couples.id = pets.couple_id
            AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
    );

CREATE POLICY "Couple members can create their pet"
    ON pets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM couples
            WHERE couples.id = pets.couple_id
            AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
    );

CREATE POLICY "Couple members can update their pet"
    ON pets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM couples
            WHERE couples.id = pets.couple_id
            AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM couples
            WHERE couples.id = pets.couple_id
            AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
    );

-- RLS Policies for Notes
CREATE POLICY "Couple members can view their notes"
    ON notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM couples
            WHERE couples.id = notes.couple_id
            AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
    );

CREATE POLICY "Couple members can create notes"
    ON notes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM couples
            WHERE couples.id = notes.couple_id
            AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can delete their own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for Memories
CREATE POLICY "Couple members can view their memories"
    ON memories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM couples
            WHERE couples.id = memories.couple_id
            AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
    );

CREATE POLICY "Couple members can create memories"
    ON memories FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM couples
            WHERE couples.id = memories.couple_id
            AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can delete their own memories"
    ON memories FOR DELETE
    USING (auth.uid() = user_id);

-- Create a storage bucket for memory images (run this in Supabase Dashboard > Storage)
-- Note: You'll need to create this bucket manually in the Supabase Dashboard
-- Bucket name: 'memories'
-- Public: false
-- File size limit: 5MB
-- Allowed mime types: image/*

-- Storage policies (add these after creating the bucket)
-- CREATE POLICY "Couple members can upload images"
--     ON storage.objects FOR INSERT
--     WITH CHECK (
--         bucket_id = 'memories'
--         AND auth.uid() IS NOT NULL
--     );

-- CREATE POLICY "Couple members can view images"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'memories');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_couples_updated_at
    BEFORE UPDATE ON couples
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pets_updated_at
    BEFORE UPDATE ON pets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at
    BEFORE UPDATE ON memories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
