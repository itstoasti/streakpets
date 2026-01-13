-- Add conversation game types to existing games table
-- Run this in Supabase SQL Editor after add-games-table.sql

-- First, check what game types currently exist
-- Run this to see what's in the database:
-- SELECT DISTINCT game_type FROM games;

-- If you see any unexpected game types, you can either:
-- 1. Delete those games: DELETE FROM games WHERE game_type NOT IN ('tictactoe', 'connectfour', 'reversi', 'dotsandboxes', 'whiteboard');
-- 2. Or update them to a valid type

-- Drop existing constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_type_check;

-- Add new constraint with ALL game types (existing + conversation games)
ALTER TABLE games ADD CONSTRAINT games_game_type_check
  CHECK (game_type IN (
    'tictactoe',
    'connectfour',
    'reversi',
    'dotsandboxes',
    'whiteboard',
    'checkers',
    'memorymatch',
    'trivia',
    'would_you_rather',
    'whos_more_likely'
  ));

-- No additional columns needed - existing game_state JSONB field
-- will store conversation-specific data structures
