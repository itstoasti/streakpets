console.log('🎮 TriviaGame.js module loading...');

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SwipeableCard } from './SwipeableCard';
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

console.log('🎮 TriviaGame.js imports completed');

/**
 * TriviaGame Component
 * Competitive multiplayer trivia where both partners answer the same questions
 * and compare scores at the end
 */
export function TriviaGame({ couple, userId, onClose, onComplete }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getConversationGameStyles(theme), [theme]);

  const [gameId, setGameId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);

  // Current question being answered
  const [localQuestionIndex, setLocalQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showingResult, setShowingResult] = useState(false);

  // Initialize game
  useEffect(() => {
    console.log('🎮 TriviaGame component mounted - userId:', userId);
    async function initGame() {
      try {
        console.log('🎮 Initializing trivia game...');
        // Determine my player number
        const playerNum = await getPlayerNumber(userId);
        console.log('🎮 Player number:', playerNum);
        setMyPlayer(playerNum);

        // Get couple data
        const coupleData = await getCoupleData();
        console.log('🎮 Couple data:', coupleData);
        if (!coupleData) {
          console.error('❌ No couple data found');
          setError('No couple data found');
          return;
        }

        // Check for existing active game
        console.log('🎮 Checking for active trivia game...');
        let game = await getActiveGame(coupleData.id, 'trivia');
        console.log('🎮 Active game:', game);

        if (!game) {
          // Create new game with 5 trivia questions
          console.log('🎮 No active game, fetching questions...');
          const questions = await getRandomQuestions('trivia', 5);
          console.log('🎮 Fetched questions:', questions);
          if (!questions || questions.length === 0) {
            console.error('❌ Failed to fetch questions');
            setError('Failed to fetch trivia questions from database');
            return;
          }

          console.log('🎮 Creating new trivia game...');
          game = await createConversationGame(
            coupleData.id,
            'trivia',
            questions,
            userId
          );
          console.log('🎮 Created game:', game);
        }

        if (game) {
          console.log('🎮 Setting game state...');
          setGameId(game.id);
          setGameState(game.game_state);
          setCurrentTurn(game.current_turn);

          // Determine which question index this player should be on
          if (playerNum === 'player1') {
            setLocalQuestionIndex(game.game_state.player1_answers?.length || 0);
          } else {
            setLocalQuestionIndex(game.game_state.player2_answers?.length || 0);
          }

          // Check if game is completed
          if (game.game_state.phase === 'completed') {
            setShowResults(true);
          }
          console.log('🎮 Game state set successfully');
        } else {
          console.log('❌ No game created/found');
          setError('Failed to create or load game');
        }
      } catch (error) {
        console.error('❌ Error initializing trivia game:', error);
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

      // Check if completed
      if (updatedGame.game_state.phase === 'completed') {
        setShowResults(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [gameId]);

  // Handle answer selection
  const handleAnswerSelect = async (option) => {
    if (selectedOption || showingResult) return;

    setSelectedOption(option);
    setShowingResult(true);

    // Submit answer
    try {
      const result = await submitConversationAnswer(gameId, userId, option);
      if (result) {
        setGameState(result.game_state);
        setCurrentTurn(result.current_turn);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  // Move to next question
  const handleNextQuestion = () => {
    setSelectedOption(null);
    setShowingResult(false);
    setLocalQuestionIndex(localQuestionIndex + 1);
  };

  // Complete game
  const handleCompleteGame = () => {
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  console.log('🎮 Render - loading:', loading, 'error:', error, 'gameState:', !!gameState, 'showResults:', showResults);

  // Loading state
  if (loading) {
    console.log('🎮 Rendering loading screen');
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
    console.log('🎮 Rendering error screen:', error);
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

  // Show results screen
  if (showResults && gameState) {
    return (
      <ResultsInsights
        gameType="trivia"
        gameState={gameState}
        onClose={onClose}
        onComplete={handleCompleteGame}
      />
    );
  }

  // Waiting for partner
  const isMyTurn = currentTurn === myPlayer;
  const myAnswers = myPlayer === 'player1'
    ? gameState?.player1_answers || []
    : gameState?.player2_answers || [];

  const haveIFinished = myAnswers.length >= (gameState?.totalQuestions || 5);

  console.log('🎮 Turn check - isMyTurn:', isMyTurn, 'currentTurn:', currentTurn, 'myPlayer:', myPlayer, 'haveIFinished:', haveIFinished);

  if (!isMyTurn || haveIFinished) {
    console.log('🎮 Rendering waiting screen');
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameContainer}>
          <View style={styles.waitingContainer}>
            <Text style={styles.title}>Trivia Challenge</Text>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.waitingText}>
              Waiting for your partner...
            </Text>
            <Text style={styles.waitingSubtext}>
              {haveIFinished
                ? "You've completed all questions! Your partner is still answering."
                : "Your partner is currently answering questions."}
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                console.log('🎮 Close button pressed in waiting screen');
                onClose();
              }}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Main game UI
  const currentQuestion = gameState?.questions?.[localQuestionIndex];
  console.log('🎮 Current question check - localQuestionIndex:', localQuestionIndex, 'hasQuestion:', !!currentQuestion);

  if (!currentQuestion) {
    console.log('🎮 Rendering no questions screen');
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameContainer}>
          <Text style={styles.title}>No Questions Available</Text>
          <Text style={styles.waitingText}>
            Unable to load trivia questions. Please try again.
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

  const myScore = myPlayer === 'player1'
    ? gameState?.player1_score || 0
    : gameState?.player2_score || 0;

  console.log('🎮 Rendering main game UI - localQuestionIndex:', localQuestionIndex, 'myScore:', myScore);

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trivia Challenge</Text>
          <Text style={styles.subtitle}>
            Test your knowledge!
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {localQuestionIndex + 1} of {gameState?.totalQuestions || 5}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((localQuestionIndex + 1) / (gameState?.totalQuestions || 5)) * 100}%`
                }
              ]}
            />
          </View>
        </View>

        {/* Score display */}
        <Text style={[styles.subtitle, { marginBottom: 15 }]}>
          Your Score: {myScore}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Question card */}
          <View style={styles.card}>
            {currentQuestion.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {currentQuestion.category}
                </Text>
              </View>
            )}

            <Text style={styles.questionText}>
              {currentQuestion.question}
            </Text>

            {/* Options */}
            {currentQuestion.options?.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionButton,
                  selectedOption === option && styles.optionButtonSelected
                ]}
                onPress={() => handleAnswerSelect(option)}
                disabled={showingResult}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedOption === option && styles.optionTextSelected
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Result display */}
            {showingResult && selectedOption && (
              <View
                style={[
                  styles.resultContainer,
                  selectedOption === currentQuestion.correct_answer
                    ? styles.correctResult
                    : styles.wrongResult
                ]}
              >
                <Text
                  style={[
                    styles.resultText,
                    selectedOption === currentQuestion.correct_answer
                      ? styles.correctText
                      : styles.wrongText
                  ]}
                >
                  {selectedOption === currentQuestion.correct_answer
                    ? '✓ Correct!'
                    : '✗ Incorrect'}
                </Text>
                {selectedOption !== currentQuestion.correct_answer && (
                  <Text style={styles.scoreText}>
                    Correct answer: {currentQuestion.correct_answer}
                  </Text>
                )}
                <Text style={styles.scoreText}>
                  Score: {myScore}
                </Text>
              </View>
            )}
          </View>

          {/* Next button */}
          {showingResult && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNextQuestion}
            >
              <Text style={styles.primaryButtonText}>
                {localQuestionIndex < (gameState?.totalQuestions || 5) - 1
                  ? 'Next Question'
                  : 'Finish'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Close button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
          >
            <Text style={styles.secondaryButtonText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

console.log('🎮 TriviaGame component function defined and exported');
