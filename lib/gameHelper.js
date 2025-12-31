import { supabase } from './supabase';
import { getCoupleData } from './storage';
import { notifyGameStarted, notifyPartnerMoved } from './notificationHelper';

/**
 * Determine if the current user is player 1 or player 2
 * Player 1 = auth_user1_id (couple creator)
 * Player 2 = auth_user2_id (couple joiner)
 */
export async function getPlayerNumber(userId) {
  const coupleData = await getCoupleData();
  if (!coupleData) return null;

  if (coupleData.auth_user1_id === userId) {
    return 'player1';
  } else if (coupleData.auth_user2_id === userId) {
    return 'player2';
  }
  return null;
}

/**
 * Create a new game session
 */
export async function createGame(coupleId, gameType, initialState, userId) {
  // Determine who is starting the game so they can go first
  const starterPlayer = userId ? await getPlayerNumber(userId) : 'player1';

  const { data, error } = await supabase
    .from('games')
    .insert({
      couple_id: coupleId,
      game_type: gameType,
      game_state: initialState,
      current_turn: starterPlayer || 'player1',
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating game:', error);
    return null;
  }

  // Send notification to partner that a new game started
  if (userId) {
    try {
      await notifyGameStarted(userId, gameType);
    } catch (notifError) {
      console.error('Error sending game started notification:', notifError);
    }
  }

  return data;
}

/**
 * Update game state
 */
export async function updateGameState(gameId, newState, nextTurn, winner = null, userId = null) {
  const updates = {
    game_state: newState,
    current_turn: nextTurn,
  };

  if (winner !== null) {
    updates.winner = winner;
    updates.is_active = false;
  }

  const { data, error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId)
    .select()
    .single();

  if (error) {
    console.error('Error updating game:', error);
    return null;
  }

  // Send notification to partner that it's their turn (only if game is still active)
  if (userId && !winner) {
    try {
      await notifyPartnerMoved(userId, data.game_type);
    } catch (notifError) {
      console.error('Error sending turn notification:', notifError);
    }
  }

  return data;
}

/**
 * Get active game for a couple by game type
 */
export async function getActiveGame(coupleId, gameType) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('game_type', gameType)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching game:', error);
    return null;
  }

  return data;
}

/**
 * End/close a game
 */
export async function endGame(gameId) {
  const { error } = await supabase
    .from('games')
    .update({ is_active: false })
    .eq('id', gameId);

  if (error) {
    console.error('Error ending game:', error);
    return false;
  }

  return true;
}

/**
 * Subscribe to game updates
 */
export function subscribeToGame(gameId, callback) {
  const subscription = supabase
    .channel(`game_${gameId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return subscription;
}

/**
 * Get all active games where it's the current user's turn
 */
export async function getMyPendingTurns(coupleId, userId) {
  const myPlayer = await getPlayerNumber(userId);
  console.log('🎮 Getting pending turns - userId:', userId, 'myPlayer:', myPlayer, 'coupleId:', coupleId);
  if (!myPlayer) {
    console.log('⚠️ No player number found for user');
    return [];
  }

  console.log('🎮 Querying games with filters:', {
    couple_id: coupleId,
    is_active: true,
    current_turn: myPlayer
  });

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('is_active', true)
    .eq('current_turn', myPlayer);

  if (error) {
    console.error('❌ Error fetching pending turns:', error);
    console.error('❌ Error details:', JSON.stringify(error));
    return [];
  }

  console.log('🎮 Query returned:', data?.length || 0, 'games');
  console.log('🎮 Found pending games:', data?.length || 0, 'games where current_turn =', myPlayer);
  if (data && data.length > 0) {
    console.log('🎮 Pending game details:', data.map(g => ({ id: g.id, type: g.game_type, turn: g.current_turn })));
  } else {
    console.log('⚠️ No games returned - checking if RLS is blocking...');
  }

  return data || [];
}

/**
 * Get count of pending turns for badge
 */
export async function getPendingTurnCount(coupleId, userId) {
  const pendingGames = await getMyPendingTurns(coupleId, userId);
  return pendingGames.length;
}
