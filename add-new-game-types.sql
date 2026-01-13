-- Add new game types (checkers, memorymatch) to the games table constraint
-- Run this in your Supabase SQL editor

-- Drop the existing constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_type_check;

-- Add the new constraint with all game types including the new ones
ALTER TABLE games ADD CONSTRAINT games_game_type_check
  CHECK (game_type IN (
    'tictactoe',
    'connectfour',
    'reversi',
    'dotsandboxes',
    'whiteboard',
    'checkers',
    'memorymatch'
  ));
