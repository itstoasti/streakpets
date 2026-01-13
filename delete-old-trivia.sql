-- Delete the old trivia game so you can start a new one
DELETE FROM games
WHERE game_type = 'trivia'
AND couple_id = 'ab54ae5b-1700-446c-a4ce-12d3eecd3b38';

-- Verify it's deleted
SELECT * FROM games WHERE game_type = 'trivia';
