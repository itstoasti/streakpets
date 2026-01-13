import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getConversationGameStyles } from './conversationGameStyles';
import { useTheme } from '../../lib/themeContext';

/**
 * Generate personality insights based on game results
 */
function generateInsights(gameType, player1Answers, player2Answers, questions) {
  const insights = [];

  // Calculate match percentage
  const matchCount = player1Answers.filter((ans, idx) =>
    ans.answer === player2Answers[idx]?.answer
  ).length;
  const matchPercentage = Math.round((matchCount / questions.length) * 100);

  // Compatibility insight based on match percentage
  if (matchPercentage >= 80) {
    insights.push({
      type: 'compatibility',
      icon: '💕',
      title: 'Twin Souls!',
      message: "You're practically reading each other's minds! This high agreement shows deep understanding."
    });
  } else if (matchPercentage >= 60) {
    insights.push({
      type: 'compatibility',
      icon: '✨',
      title: 'Great Chemistry',
      message: 'You agree on the important things, but keep things interesting with different perspectives!'
    });
  } else if (matchPercentage >= 40) {
    insights.push({
      type: 'compatibility',
      icon: '🌈',
      title: 'Opposites Attract',
      message: 'Your different viewpoints create a balanced relationship. Diversity is your strength!'
    });
  } else {
    insights.push({
      type: 'compatibility',
      icon: '🎭',
      title: 'Delightfully Different',
      message: "You're total opposites - which means you'll never run out of things to discuss!"
    });
  }

  // Game-specific insights
  if (gameType === 'trivia') {
    // Find shared knowledge areas
    const categories = {};
    player1Answers.forEach((ans, idx) => {
      const question = questions[idx];
      if (ans.isCorrect && player2Answers[idx]?.isCorrect) {
        const cat = question.category || 'General';
        categories[cat] = (categories[cat] || 0) + 1;
      }
    });

    const sharedStrengths = Object.entries(categories)
      .filter(([_, count]) => count >= 2)
      .map(([cat, _]) => cat);

    if (sharedStrengths.length > 0) {
      insights.push({
        type: 'strength',
        icon: '🧠',
        title: 'Shared Expertise',
        message: `You both excel at ${sharedStrengths.join(', ')}! Power couple vibes.`
      });
    }

    // Check for complementary knowledge
    const p1Correct = player1Answers.filter(a => a.isCorrect).length;
    const p2Correct = player2Answers.filter(a => a.isCorrect).length;
    const diff = Math.abs(p1Correct - p2Correct);

    if (diff <= 1 && p1Correct >= questions.length / 2) {
      insights.push({
        type: 'teamwork',
        icon: '🤝',
        title: 'Dynamic Duo',
        message: 'Your knowledge levels are perfectly balanced - together you make an unstoppable team!'
      });
    }
  }

  if (gameType === 'would_you_rather') {
    // Analyze adventure vs safety preferences
    const p1Adventures = player1Answers.filter(a => a.answer === 'A').length;
    const p2Adventures = player2Answers.filter(a => a.answer === 'A').length;

    const avgAdventures = (p1Adventures + p2Adventures) / 2 / questions.length;

    if (avgAdventures > 0.6) {
      insights.push({
        type: 'personality',
        icon: '🚀',
        title: 'Adventure Seekers',
        message: 'You both love taking risks and trying new things. Your relationship is full of exciting experiences!'
      });
    } else if (avgAdventures < 0.4) {
      insights.push({
        type: 'personality',
        icon: '🏡',
        title: 'Comfort Lovers',
        message: 'You both appreciate stability and familiar joys. Your relationship is a cozy safe haven!'
      });
    }
  }

  if (gameType === 'whos_more_likely') {
    // Analyze self-perception vs partner perception
    let selfAware = 0;
    let disagreeCount = 0;

    player1Answers.forEach((ans, idx) => {
      const p2Ans = player2Answers[idx]?.answer;
      if (ans.answer === p2Ans) {
        selfAware++;
      } else {
        disagreeCount++;
      }
    });

    if (selfAware > questions.length * 0.7) {
      insights.push({
        type: 'awareness',
        icon: '👁️',
        title: 'Deeply Connected',
        message: 'You see each other clearly and agree on your strengths. This self-awareness strengthens your bond!'
      });
    } else if (disagreeCount > questions.length * 0.5) {
      insights.push({
        type: 'discovery',
        icon: '🔍',
        title: 'Room for Discovery',
        message: 'You see each other differently! Use this as a conversation starter to learn more about one another.'
      });
    }
  }

  return { matchPercentage, matchCount, insights };
}

/**
 * QuestionResultCard Component
 * Displays a single question's results with both partners' answers
 */
function QuestionResultCard({ question, player1Answer, player2Answer, questionIndex, gameType, styles, theme }) {
  const isMatch = player1Answer?.answer === player2Answer?.answer;

  // Format answer display based on game type
  const formatAnswer = (answer) => {
    if (gameType === 'trivia') {
      return answer?.answer || 'No answer';
    }
    return answer?.answer || 'No answer';
  };

  return (
    <View
      style={[
        styles.questionResultCard,
        isMatch && styles.questionResultMatch
      ]}
    >
      {/* Header with question number and match badge */}
      <View style={styles.questionResultHeader}>
        <View style={styles.questionNumberBadge}>
          <Text style={styles.questionNumberBadgeText}>
            Q{questionIndex + 1}
          </Text>
        </View>

        {isMatch && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>✨ Match!</Text>
          </View>
        )}
      </View>

      {/* Question text */}
      <Text style={styles.questionResultText}>
        {question.question || question.optionA && `${question.optionA} or ${question.optionB}`}
      </Text>

      {/* Both partners' answers */}
      <View style={styles.answersContainer}>
        {/* Player 1 answer */}
        <View
          style={[
            styles.answerBox,
            isMatch && styles.answerBoxMatch
          ]}
        >
          <View style={[styles.playerAvatar, styles.player1Avatar]}>
            <Text style={styles.playerAvatarText}>P1</Text>
          </View>
          <Text style={styles.answerText}>
            {formatAnswer(player1Answer)}
          </Text>
          {gameType === 'trivia' && player1Answer?.isCorrect && (
            <Text style={{ color: theme.success, marginTop: 4 }}>✓ Correct</Text>
          )}
        </View>

        {/* Player 2 answer */}
        <View
          style={[
            styles.answerBox,
            isMatch && styles.answerBoxMatch
          ]}
        >
          <View style={[styles.playerAvatar, styles.player2Avatar]}>
            <Text style={styles.playerAvatarText}>P2</Text>
          </View>
          <Text style={styles.answerText}>
            {formatAnswer(player2Answer)}
          </Text>
          {gameType === 'trivia' && player2Answer?.isCorrect && (
            <Text style={{ color: theme.success, marginTop: 4 }}>✓ Correct</Text>
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * ResultsInsights Component
 * Displays comprehensive results with personality insights
 */
export function ResultsInsights({ gameType, gameState, onClose, onComplete }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getConversationGameStyles(theme), [theme]);

  const { matchPercentage, matchCount, insights } = useMemo(() =>
    generateInsights(
      gameType,
      gameState.player1_answers || [],
      gameState.player2_answers || [],
      gameState.questions || []
    ),
    [gameType, gameState]
  );

  return (
    <SafeAreaView style={styles.fullScreenContainer}>
      <LinearGradient
        colors={theme.gradient}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero section with match percentage */}
          <View style={styles.resultsHeroSection}>
            <Text style={styles.resultsTitle}>Your Results 💕</Text>

            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{matchPercentage}%</Text>
              <Text style={styles.scoreLabel}>
                {gameType === 'trivia' ? 'Average Score' : 'Match'}
              </Text>
            </View>

            <Text style={styles.matchCount}>
              {gameType === 'trivia'
                ? `P1: ${gameState.player1_score || 0} | P2: ${gameState.player2_score || 0}`
                : `${matchCount} out of ${gameState.questions?.length || 0} matches`}
            </Text>
          </View>

          {/* Insight cards */}
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightMessage}>{insight.message}</Text>
            </View>
          ))}

          {/* Detailed question breakdown */}
          <Text style={styles.sectionHeader}>Question Breakdown</Text>

          {gameState.questions?.map((question, idx) => (
            <QuestionResultCard
              key={idx}
              question={question}
              player1Answer={gameState.player1_answers?.[idx]}
              player2Answer={gameState.player2_answers?.[idx]}
              questionIndex={idx}
              gameType={gameType}
              styles={styles}
              theme={theme}
            />
          ))}

          {/* Action buttons */}
          <View style={{ padding: 20, paddingBottom: 40 }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onComplete}
            >
              <Text style={styles.primaryButtonText}>
                Complete & Earn Coins
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
