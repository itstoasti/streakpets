import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SwipeableCard } from './SwipeableCard';
import { AnswerCard } from './AnswerCard';
import { ResultsInsights } from './ResultsInsights';
import { getConversationGameStyles } from './conversationGameStyles';
import { useTheme } from '../../lib/themeContext';
import {
  createConversationGame,
  submitConversationAnswer,
  getActiveGame,
  subscribeToGame,
  getPlayerNumber,
} from '../../lib/gameHelper';
import { getRandomQuestions } from '../../lib/questionsHelper';
import { getCoupleData } from '../../lib/storage';

/**
 * WouldYouRatherGame Component
 * Remote multiplayer Would You Rather game with swipeable cards
 * Swipe LEFT = Option A, Swipe RIGHT = Option B
 */
export function WouldYouRatherGame({ couple, userId, onClose, onComplete }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getConversationGameStyles(theme), [theme]);

  const [gameId, setGameId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);

  // Current question state
  const [showingMyAnswer, setShowingMyAnswer] = useState(false);
  const [myLastAnswer, setMyLastAnswer] = useState(null);

  // Initialize game
  useEffect(() => {
    async function initGame() {
      try {
        const playerNum = await getPlayerNumber(userId);
        setMyPlayer(playerNum);

        const coupleData = await getCoupleData();
        if (!coupleData) return;

        let game = await getActiveGame(coupleData.id, 'would_you_rather');

        if (!game) {
          // Create new game with 8 questions
          const questions = await getRandomQuestions('would_you_rather', 8);
          if (!questions || questions.length === 0) {
            console.error('Failed to fetch questions');
            return;
          }

          // Parse questions to extract optionA and optionB
          const parsedQuestions = questions.map(q => {
            const parts = q.question.match(/Would you rather (.+) or (.+)\?/i);
            return {
              id: q.id,
              question: q.question,
              optionA: parts ? parts[1].trim() : 'Option A',
              optionB: parts ? parts[2].trim() : 'Option B',
            };
          });

          game = await createConversationGame(
            coupleData.id,
            'would_you_rather',
            parsedQuestions,
            userId
          );
        }

        if (game) {
          setGameId(game.id);
          setGameState(game.game_state);
          setCurrentTurn(game.current_turn);

          if (game.game_state.phase === 'completed') {
            setShowResults(true);
          }
        }
      } catch (error) {
        console.error('❌ Error initializing Would You Rather game:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setError(error.message || 'Failed to initialize game');
      } finally {
        setLoading(false);
      }
    }

    initGame();
  }, [userId]);

  // Subscribe to game updates
  useEffect(() => {
    if (!gameId) return;

    const subscription = subscribeToGame(gameId, (updatedGame) => {
      setGameState(updatedGame.game_state);
      setCurrentTurn(updatedGame.current_turn);

      if (updatedGame.game_state.phase === 'completed') {
        setShowResults(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [gameId]);

  // Handle swipe answer
  const handleAnswer = async (answer) => {
    setMyLastAnswer(answer);
    setShowingMyAnswer(true);

    // Submit answer to database
    try {
      const result = await submitConversationAnswer(gameId, userId, answer);
      if (result) {
        setGameState(result.game_state);
        setCurrentTurn(result.current_turn);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  // Move to next state
  const handleNext = () => {
    setShowingMyAnswer(false);
    setMyLastAnswer(null);
  };

  // Complete game
  const handleCompleteGame = () => {
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  // Loading
  if (loading) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.waitingText}>Loading game...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameContainer}>
          <Text style={styles.title}>Error</Text>
          <Text style={styles.waitingText}>{error}</Text>
          <Text style={styles.waitingSubtext}>
            Please make sure the database schema is set up correctly.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onClose}
          >
            <Text style={styles.primaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show results
  if (showResults && gameState) {
    return (
      <ResultsInsights
        gameType="would_you_rather"
        gameState={gameState}
        onClose={onClose}
        onComplete={handleCompleteGame}
      />
    );
  }

  // Determine game state
  const isMyTurn = currentTurn === myPlayer;
  const currentQuestion = gameState?.questions?.[gameState?.currentQuestionIndex || 0];

  // Waiting screen
  if (!isMyTurn || !currentQuestion) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameContainer}>
          <View style={styles.waitingContainer}>
            <Text style={styles.title}>Would You Rather</Text>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.waitingText}>
              Waiting for your partner...
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Show answer confirmation
  if (showingMyAnswer) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Would You Rather</Text>
          </View>

          <View style={styles.waitingContainer}>
            <Text style={styles.questionText}>
              {currentQuestion.question}
            </Text>

            <View style={styles.card}>
              <Text style={styles.waitingText}>
                You chose:
              </Text>
              <Text style={styles.questionText}>
                {myLastAnswer === 'A' ? currentQuestion.optionA : currentQuestion.optionB}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Main game UI with swipeable card
  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Would You Rather</Text>
          <Text style={styles.subtitle}>
            Swipe left or right to choose
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {(gameState?.currentQuestionIndex || 0) + 1} of {gameState?.totalQuestions || 8}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(((gameState?.currentQuestionIndex || 0) + 1) / (gameState?.totalQuestions || 8)) * 100}%`
                }
              ]}
            />
          </View>
        </View>

        {/* Player indicator */}
        {gameState?.phase && (
          <View style={styles.playerIndicator}>
            <Text style={styles.playerIndicatorText}>
              Your Turn
            </Text>
          </View>
        )}

        {/* Swipeable question card */}
        <SwipeableCard
          onSwipeLeft={() => handleAnswer('A')}
          onSwipeRight={() => handleAnswer('B')}
        >
          <AnswerCard
            question="Would you rather..."
            leftOption={currentQuestion.optionA}
            rightOption={currentQuestion.optionB}
            questionNumber={`Question ${(gameState?.currentQuestionIndex || 0) + 1} of ${gameState?.totalQuestions || 8}`}
            theme={theme}
          />
        </SwipeableCard>

        {/* Close button */}
        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 20 }]}
          onPress={onClose}
        >
          <Text style={styles.secondaryButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
