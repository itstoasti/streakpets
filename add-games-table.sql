-- Create games table for multiplayer activities
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('tictactoe', 'connectfour', 'reversi', 'dotsandboxes', 'whiteboard')),
  game_state JSONB NOT NULL,
  current_turn TEXT CHECK (current_turn IN ('player1', 'player2')),
  winner TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_games_couple_id ON games(couple_id);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);

-- RLS Policies for Games Table
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can view their games"
  ON games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = games.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can create games"
  ON games FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = games.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can update their games"
  ON games FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = games.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

CREATE POLICY "Couple members can delete their games"
  ON games FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = games.couple_id
      AND (couples.auth_user1_id = auth.uid() OR couples.auth_user2_id = auth.uid())
    )
  );

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
