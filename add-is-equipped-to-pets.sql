-- Add is_equipped column to pets table
-- This allows couples to have multiple pets and switch between them

-- Add the column
ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_equipped BOOLEAN DEFAULT false;

-- Set existing pets as equipped
UPDATE pets SET is_equipped = true WHERE is_equipped IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pets_couple_equipped ON pets(couple_id, is_equipped);

-- Remove unique constraint on couple_id if it exists (allows multiple pets per couple)
-- First check if the constraint exists and drop it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'pets_couple_id_key'
        AND table_name = 'pets'
    ) THEN
        ALTER TABLE pets DROP CONSTRAINT pets_couple_id_key;
    END IF;
END $$;

-- Enable realtime for pets table (for instant pet switching sync)
ALTER PUBLICATION supabase_realtime ADD TABLE pets;
