console.log('🎮 conversationGameStyles.js loading...');
import { StyleSheet } from 'react-native';
console.log('🎮 conversationGameStyles.js imports done');

// Animation timings
export const Animations = {
  swipeThreshold: 120,
  springConfig: {
    friction: 5,
    tension: 40,
  },
  fadeInDuration: 300,
  slideInDuration: 400,
};

/**
 * Get conversation game styles based on theme
 * @param {object} theme - Theme object from useTheme()
 * @returns {object} StyleSheet styles
 */
export function getConversationGameStyles(theme) {
  return StyleSheet.create({
    // Container styles
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    gameContainer: {
      width: '90%',
      maxWidth: 500,
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      maxHeight: '85%',
    },

    fullScreenContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },

    // Header styles
    header: {
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: 2,
      borderBottomColor: theme.border,
    },

    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.primary,
      textAlign: 'center',
    },

    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 5,
      textAlign: 'center',
    },

    // Progress styles
    progressContainer: {
      marginBottom: 15,
    },

    progressText: {
      fontSize: 16,
      color: theme.primary,
      textAlign: 'center',
      fontWeight: '600',
    },

    progressBar: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      marginTop: 8,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },

    // Player indicator styles
    playerIndicator: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.primary,
      marginBottom: 15,
      alignSelf: 'center',
    },

    playerIndicatorText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },

    // Card styles
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginVertical: 10,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },

    cardGradient: {
      borderRadius: 16,
      padding: 20,
    },

    questionCard: {
      minHeight: 400,
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    // Question styles
    categoryBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      alignSelf: 'flex-start',
      marginBottom: 15,
    },

    categoryText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },

    questionText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.primary,
      textAlign: 'center',
      marginVertical: 20,
      lineHeight: 32,
    },

    questionNumber: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 10,
    },

    // Swipe hint styles
    hintsContainer: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
    },

    leftHint: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    rightHint: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    hintArrow: {
      fontSize: 24,
      color: theme.primary,
      fontWeight: 'bold',
    },

    hintText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: '600',
      marginHorizontal: 8,
    },

    swipeInstruction: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 15,
      fontStyle: 'italic',
    },

    // Button styles
    primaryButton: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 25,
      alignItems: 'center',
      marginVertical: 8,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },

    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },

    secondaryButton: {
      backgroundColor: theme.card,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: theme.primary,
      alignItems: 'center',
      marginVertical: 8,
    },

    secondaryButtonText: {
      color: theme.primary,
      fontSize: 18,
      fontWeight: 'bold',
    },

    disabledButton: {
      backgroundColor: theme.border,
      opacity: 0.6,
    },

    // Waiting/Loading styles
    waitingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      minHeight: 300,
    },

    waitingText: {
      fontSize: 20,
      color: theme.primary,
      textAlign: 'center',
      marginTop: 20,
      fontWeight: '600',
    },

    waitingSubtext: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 10,
    },

    // Results styles
    resultsHeroSection: {
      alignItems: 'center',
      paddingVertical: 30,
      paddingHorizontal: 20,
    },

    resultsTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 20,
    },

    scoreCircle: {
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: theme.card,
      borderWidth: 4,
      borderColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
    },

    scoreNumber: {
      fontSize: 48,
      fontWeight: 'bold',
      color: theme.primary,
    },

    scoreLabel: {
      fontSize: 18,
      color: theme.textSecondary,
      marginTop: 5,
    },

    matchCount: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 10,
    },

    // Insight card styles
    insightCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 20,
      marginVertical: 10,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },

    insightIcon: {
      fontSize: 40,
      textAlign: 'center',
      marginBottom: 10,
    },

    insightTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.primary,
      textAlign: 'center',
      marginBottom: 8,
    },

    insightMessage: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },

    // Question result card styles
    questionResultCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 15,
      marginHorizontal: 20,
      marginVertical: 8,
      borderWidth: 2,
      borderColor: theme.border,
    },

    questionResultMatch: {
      borderColor: theme.success,
      backgroundColor: theme.background,
    },

    questionResultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },

    questionNumberBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },

    questionNumberBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },

    matchBadge: {
      backgroundColor: theme.success,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },

    matchBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
      marginLeft: 4,
    },

    questionResultText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 12,
    },

    answersContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },

    answerBox: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 8,
      padding: 12,
      borderWidth: 2,
      borderColor: theme.border,
    },

    answerBoxMatch: {
      backgroundColor: theme.background,
      borderColor: theme.success,
    },

    playerAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },

    player1Avatar: {
      backgroundColor: theme.primary,
    },

    player2Avatar: {
      backgroundColor: theme.primaryLight,
    },

    playerAvatarText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },

    answerText: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '600',
    },

    // Trivia-specific styles
    optionButton: {
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
    },

    optionButtonSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },

    optionText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: '600',
      textAlign: 'center',
    },

    optionTextSelected: {
      color: '#FFFFFF',
    },

    resultContainer: {
      marginTop: 20,
      padding: 15,
      borderRadius: 12,
      backgroundColor: theme.background,
    },

    correctResult: {
      backgroundColor: '#f0fff4',
      borderWidth: 2,
      borderColor: theme.success,
    },

    wrongResult: {
      backgroundColor: '#fff5f5',
      borderWidth: 2,
      borderColor: theme.error,
    },

    resultText: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 8,
    },

    correctText: {
      color: theme.success,
    },

    wrongText: {
      color: theme.error,
    },

    scoreText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
    },

    // Section header styles
    sectionHeader: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.primary,
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 10,
    },
  });
}
