-- Create a database function to get pending turns
-- This bypasses RLS issues by running with SECURITY DEFINER

-- Drop function if exists
DROP FUNCTION IF EXISTS get_pending_turns(uuid);

-- Create function to get pending turns for a user
CREATE OR REPLACE FUNCTION get_pending_turns(user_id uuid)
RETURNS TABLE (
  id uuid,
  couple_id uuid,
  game_type text,
  game_state jsonb,
  current_turn text,
  winner text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER -- Run with privileges of the function owner
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  couple_record RECORD;
  player_num text;
BEGIN
  -- Find the couple for this user
  SELECT * INTO couple_record
  FROM couples
  WHERE auth_user1_id = user_id OR auth_user2_id = user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no couple found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Determine if user is player1 or player2
  IF couple_record.auth_user1_id = user_id THEN
    player_num := 'player1';
  ELSE
    player_num := 'player2';
  END IF;

  -- Return games where it's this player's turn
  RETURN QUERY
  SELECT g.*
  FROM games g
  WHERE g.couple_id = couple_record.id
    AND g.is_active = true
    AND g.current_turn = player_num;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_turns(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_turns(uuid) TO anon;
