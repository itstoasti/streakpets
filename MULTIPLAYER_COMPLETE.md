# Multiplayer Games - Complete Implementation

## ✅ ALL GAMES NOW FULLY MULTIPLAYER!

All 4 strategy games have been updated to be truly 2-player with real-time synchronization.

### 1. Tic Tac Toe ✅
- **Player 1**: X (couple creator)
- **Player 2**: O (couple joiner)
- Turn-based gameplay
- Real-time move synchronization
- Prevents moves on opponent's turn
- Shows "Your Turn!" vs "Partner's Turn"

### 2. Connect Four ✅
- **Player 1**: Red (🔴)
- **Player 2**: Yellow (🟡)
- Turn-based gameplay
- Gravity-based piece dropping
- Real-time synchronization
- Win detection with 4-in-a-row

### 3. Reversi (Othello) ✅
- **Player 1**: Black (⚫)
- **Player 2**: White (⚪)
- Turn-based gameplay
- Real-time board updates
- Piece flipping logic synced
- Automatic turn passing when no valid moves
- Score tracking for both players

### 4. Dots and Boxes ✅
- **Player 1**: Blue (🟦)
- **Player 2**: Red (🟥)
- Turn-based gameplay
- Real-time line drawing
- Box completion detection
- Extra turn on box completion (correct Dots & Boxes rule)
- Score tracking

## How It Works

### Database Structure
All games use the `games` table:
```sql
- id: Unique game ID
- couple_id: Links to the couple
- game_type: tictactoe | connectfour | reversi | dotsandboxes
- game_state: JSONB with board/lines/boxes/scores
- current_turn: player1 or player2
- winner: Winner or draw status
- is_active: Whether game is ongoing
```

### Real-Time Sync
- Uses Supabase Realtime subscriptions
- When Player 1 makes a move, Player 2 sees it instantly
- Board state updates automatically on both devices
- Turn indicators update in real-time

### Turn Management
- Each player can ONLY make moves on their turn
- Attempting to move on opponent's turn shows alert
- Turn switches automatically after each move
- Special case: Dots & Boxes gives extra turn on box completion

### Game Persistence
- Games persist across app restarts
- If you close and reopen, the game continues where you left off
- One active game per type per couple
- "New Game" button resets the board

## Non-Competitive Games (Unchanged)

These games remain as-is since they're not competitive:

### Trivia Game
- Single-player quiz
- Each partner can play independently

### Would You Rather
- Discussion/conversation game
- Not competitive

### Who's More Likely To
- Discussion/conversation game
- Not competitive

### Whiteboard
- Shared drawing canvas
- Already synchronized (uses game state)

## Setup Instructions

### 1. Run SQL in Supabase

Go to your Supabase SQL Editor and run:

```sql
-- Add streak columns to couples table
ALTER TABLE couples
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_couples_last_activity ON couples(last_activity_date);

-- Create games table
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

CREATE INDEX IF NOT EXISTS idx_games_couple_id ON games(couple_id);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
```

### 2. Test the Games

1. **Device 1**: Login as User 1, go to Activities
2. **Device 2**: Login as User 2 (paired), go to Activities
3. **Device 1**: Start Tic Tac Toe
4. **Device 2**: Open Tic Tac Toe - should see same game
5. Take turns playing - moves appear in real-time!
6. Test all 4 games

## What's Now Shared in Real-Time

✅ **Pet Happiness** - When one partner feeds/plays, both see it
✅ **Streak** - Shared streak counter updates for both
✅ **All Game Moves** - Every move syncs instantly
✅ **Turn Indicators** - Both see whose turn it is
✅ **Game State** - Board positions, scores, winners

## What's Still Separate

❌ **Coin Balance** - Each user has their own coins
❌ **Owned Pets** - Individual pet collections

---

**Status**: All multiplayer features are now complete and ready to test!
