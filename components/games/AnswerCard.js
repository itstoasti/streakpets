import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getConversationGameStyles } from './conversationGameStyles';

/**
 * AnswerCard Component
 *
 * Displays a question card with clear visual swipe indicators
 * Used inside SwipeableCard for visual presentation
 */
export function AnswerCard({
  question,
  leftOption,
  rightOption,
  upOption = null,
  category = null,
  showHints = true,
  questionNumber = null,
  theme,
}) {
  const baseStyles = useMemo(() => getConversationGameStyles(theme), [theme]);
  const styles = useMemo(() => getCardStyles(theme), [theme]);

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={[theme.backgroundSecondary, theme.card]}
        style={styles.cardGradient}
      >
        {/* Question number at top */}
        {questionNumber && (
          <Text style={styles.questionNumber}>{questionNumber}</Text>
        )}

        {/* Main question text - scrollable if long */}
        <ScrollView
          style={styles.questionScrollContainer}
          contentContainerStyle={styles.questionContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.questionText}>{question}</Text>
        </ScrollView>

        {/* Swipe guide at bottom */}
        {showHints && (
          <View style={styles.swipeGuideContainer}>
            {/* Up option (for Who's More Likely) */}
            {upOption && (
              <View style={styles.upOptionRow}>
                <View style={[styles.optionBubble, styles.upBubble]}>
                  <Text style={styles.swipeArrow}>↑</Text>
                  <Text style={styles.optionLabel}>{upOption}</Text>
                </View>
              </View>
            )}

            {/* Left and Right options */}
            <View style={styles.horizontalOptions}>
              {/* Left Option */}
              <View style={[styles.optionBubble, styles.leftBubble]}>
                <Text style={styles.swipeArrow}>←</Text>
                <Text style={styles.optionLabel}>{leftOption}</Text>
              </View>

              {/* Swipe instruction */}
              <View style={styles.centerInstruction}>
                <Text style={styles.instructionText}>Swipe to answer</Text>
              </View>

              {/* Right Option */}
              <View style={[styles.optionBubble, styles.rightBubble]}>
                <Text style={styles.swipeArrow}>→</Text>
                <Text style={styles.optionLabel}>{rightOption}</Text>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const getCardStyles = (theme) => StyleSheet.create({
  cardWrapper: {
    width: '100%',
    minHeight: 380,
    maxHeight: 450,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
  },
  questionNumber: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  questionScrollContainer: {
    flex: 1,
    marginBottom: 15,
  },
  questionContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    lineHeight: 32,
  },
  swipeGuideContainer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  upOptionRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  horizontalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerInstruction: {
    alignItems: 'center',
    flex: 1,
  },
  instructionText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  optionBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  leftBubble: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  rightBubble: {
    backgroundColor: '#F3E5F5',
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  upBubble: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
    flexDirection: 'row',
    gap: 8,
  },
  swipeArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
    marginTop: 2,
  },
});
