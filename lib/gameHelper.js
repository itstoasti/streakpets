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
  if (!myPlayer) {
    return [];
  }

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('is_active', true)
    .eq('current_turn', myPlayer);

  if (error) {
    console.error('❌ Error fetching pending turns:', error);
    return [];
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

/**
 * Create a conversation game with pre-fetched questions
 * For: trivia, would_you_rather, whos_more_likely
 */
export async function createConversationGame(coupleId, gameType, questions, userId) {
  const starterPlayer = userId ? await getPlayerNumber(userId) : 'player1';

  // Initialize game state based on type
  const initialState = {
    questions: questions,
    player1_answers: [],
    player2_answers: [],
    currentQuestionIndex: 0,
    totalQuestions: questions.length,
    phase: 'player1_answering'
  };

  // Add score tracking for trivia
  if (gameType === 'trivia') {
    initialState.player1_score = 0;
    initialState.player2_score = 0;
  }

  return await createGame(coupleId, gameType, initialState, userId);
}

/**
 * Submit answer for conversation game
 */
export async function submitConversationAnswer(gameId, userId, answer) {
  // Get current game state
  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (fetchError || !game) {
    console.error('Error fetching game:', fetchError);
    return null;
  }

  const myPlayer = await getPlayerNumber(userId);
  if (!myPlayer) {
    console.error('Could not determine player number');
    return null;
  }

  const state = { ...game.game_state };
  const currentQuestion = state.questions[state.currentQuestionIndex];

  // Create answer object
  const answerObj = {
    questionId: currentQuestion.id,
    answer: answer,
    timestamp: new Date().toISOString()
  };

  // For trivia, check if answer is correct
  if (game.game_type === 'trivia') {
    answerObj.isCorrect = answer === currentQuestion.correct_answer;
  }

  // Add answer to appropriate player's array
  if (myPlayer === 'player1') {
    state.player1_answers.push(answerObj);

    // Update score for trivia
    if (game.game_type === 'trivia' && answerObj.isCorrect) {
      state.player1_score = (state.player1_score || 0) + 1;
    }

    // Switch to player 2's turn
    state.phase = 'player2_answering';
  } else {
    state.player2_answers.push(answerObj);

    // Update score for trivia
    if (game.game_type === 'trivia' && answerObj.isCorrect) {
      state.player2_score = (state.player2_score || 0) + 1;
    }

    // Both players answered - advance to next question or complete
    if (state.currentQuestionIndex < state.totalQuestions - 1) {
      state.currentQuestionIndex += 1;
      state.phase = 'player1_answering';
    } else {
      state.phase = 'completed';
    }
  }

  // Determine next turn and winner
  let nextTurn = state.phase === 'player1_answering' ? 'player1' : 'player2';
  let winner = null;

  if (state.phase === 'completed') {
    if (game.game_type === 'trivia') {
      // Determine winner based on score
      winner = state.player1_score > state.player2_score ? 'Player 1' :
               state.player2_score > state.player1_score ? 'Player 2' : 'Draw';
    } else {
      // Both players completed for other game types
      winner = 'Both';
    }
  }

  // Update game state in database
  return await updateGameState(gameId, state, nextTurn, winner, userId);
}
