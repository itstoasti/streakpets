# Multiplayer Games Implementation Summary

## Completed ✅

### 1. Tic Tac Toe - DONE
- Player 1 (couple creator) = X
- Player 2 (couple joiner) = O
- Turn-based with real-time sync
- Shows "Your Turn" vs "Partner's Turn"
- Prevents moves on opponent's turn

### 2. Connect Four - DONE
- Player 1 = Red (🔴)
- Player 2 = Yellow (🟡)
- Turn-based with real-time sync
- Gravity-based piece dropping
- Win detection with 4-in-a-row

## Still Single-Player (Need Updates)

### 3. Reversi (Othello)
**Current**: One person plays both black and white
**Needed**: Player 1 = Black, Player 2 = White, turn-based

Key changes needed in ReversiGame function (line ~1314):
- Add couple, userId props
- Add myPlayer, gameId, loading state
- Init game with Supabase 'reversi' game type
- Update makeMove() to check currentTurn === myPlayer
- Add real-time subscription
- Store board state in Supabase game_state.board

### 4. Dots and Boxes
**Current**: One person plays both players
**Needed**: Player 1 vs Player 2, alternating turns

Key changes needed in DotsAndBoxesGame function (line ~792):
- Add couple, userId props
- Add myPlayer, gameId, loading state
- Init game with Supabase 'dotsandboxes' game type
- Update handleLineClick() to check currentTurn === myPlayer
- Store horizontalLines, verticalLines, boxes in game_state
- Real-time sync for line clicks

## Games That Should Stay As-Is

### 5. Trivia - Keep Single Player
Each person can quiz themselves independently

### 6. Would You Rather - Keep As-Is
Discussion/conversation game, not competitive

### 7. Who's More Likely - Keep As-Is
Discussion/conversation game, not competitive

### 8. Whiteboard - Already Shared
Drawing canvas is already synchronized (needs game_state persistence)

## Database Setup

Run this SQL (already created in add-games-table.sql):

```sql
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
```

## Testing

1. Run SQL in Supabase
2. Device 1: Start Tic Tac Toe
3. Device 2: Open Tic Tac Toe - should see same game
4. Players take turns, moves sync in real-time
5. Repeat for Connect Four

## Next Steps

Would you like me to:
A) Update Reversi and Dots & Boxes to be multiplayer (recommended)
B) Leave them as single-player for now
C) Remove them entirely since they're complex
