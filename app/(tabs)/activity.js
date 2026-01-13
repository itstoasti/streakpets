import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  PanResponder,
  Dimensions,
  Image,
  SafeAreaView,
  InteractionManager,
  TextInput,
} from 'react-native';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { useIsFocused } from '@react-navigation/native';
import { getPetData, savePetData, getCurrency, saveCurrency, getStreakData, saveStreakData, getCoupleData } from '../../lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateGalleryWidget } from '../../lib/widgetHelper';
import { SkiaDrawingCanvas } from '../components/SkiaDrawingCanvas';
import { File, Paths } from 'expo-file-system';
import { getMyPendingTurns, createGame, updateGameState, getActiveGame, endGame } from '../../lib/gameHelper';
import { notifyGameStarted } from '../../lib/notificationHelper';
import { getRandomQuestions } from '../../lib/questionsHelper';
import { TriviaGame } from '../../components/games/TriviaGame';
import { WouldYouRatherGame } from '../../components/games/WouldYouRatherGame';
import { WhosMoreLikelyGame } from '../../components/games/WhosMoreLikelyGame';
import { useTheme } from '../../lib/themeContext';
import { useInterstitialAd } from '../../lib/interstitialAds';

// Custom Slider Component
function CustomSlider({ value, onValueChange, minimumValue, maximumValue, step, style }) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const trackRef = useRef(null);

  const handleTouch = (event) => {
    if (sliderWidth === 0 || !trackRef.current) return;

    trackRef.current.measure((fx, fy, width, height, px, py) => {
      const { pageX } = event.nativeEvent;
      const relativeX = pageX - px;
      const percentage = Math.max(0, Math.min(1, relativeX / width));
      const range = maximumValue - minimumValue;
      let newValue = minimumValue + (percentage * range);

      if (step > 0) {
        newValue = Math.round(newValue / step) * step;
      }

      newValue = Math.max(minimumValue, Math.min(maximumValue, newValue));
      onValueChange(newValue);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: handleTouch,
    onPanResponderMove: handleTouch,
  });

  const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
  const thumbPosition = (percentage / 100) * sliderWidth;

  return (
    <View
      style={[styles.customSliderContainer, style]}
      onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
    >
      <View
        ref={trackRef}
        style={styles.customSliderTrack}
        {...panResponder.panHandlers}
      >
        <View style={[styles.customSliderFill, { width: `${percentage}%` }]} />
        <View style={[styles.customSliderThumb, {
          left: thumbPosition - 12,
        }]} />
      </View>
    </View>
  );
}

export default function ActivityScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { user } = useAuth();
  const userId = user?.id;
  const isFocused = useIsFocused();
  const [couple, setCouple] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showTicTacToe, setShowTicTacToe] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showDotsAndBoxes, setShowDotsAndBoxes] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showConnectFour, setShowConnectFour] = useState(false);
  const [showReversi, setShowReversi] = useState(false);
  const [showCheckers, setShowCheckers] = useState(false);
  const [showMemoryMatch, setShowMemoryMatch] = useState(false);
  const [showWouldYouRather, setShowWouldYouRather] = useState(false);
  const [showWhosMoreLikely, setShowWhosMoreLikely] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });
  const [pendingGames, setPendingGames] = useState(new Set());

  // Interstitial ad hook - shows ads after game completion (max 1 per 5 mins)
  const { showAdIfAllowed } = useInterstitialAd();

  useEffect(() => {
    if (isFocused && user) {
      loadCoupleData();
    }
  }, [isFocused, user]);

  useEffect(() => {
    if (!couple || !userId) return;

    let subscription;

    async function loadPendingTurns() {
      const pendingTurns = await getMyPendingTurns(couple.id, userId);
      const gameTypes = new Set(pendingTurns.map(game => game.game_type));
      setPendingGames(gameTypes);

      // Subscribe to game updates
      subscription = supabase
        .channel('activity_games_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games',
            filter: `couple_id=eq.${couple.id}`
          },
          async () => {
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);
          }
        )
        .subscribe();
    }

    loadPendingTurns();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [couple, userId]);

  // Real-time subscription for whiteboard drawings (for widget sync)
  useEffect(() => {
    if (!couple || !isSupabaseConfigured()) return;

    let drawingsSubscription;

    async function syncDrawingsFromDatabase() {
      try {
        console.log('🔄 Syncing whiteboard drawings from database...');

        // Fetch latest drawings from database
        const { data: drawings, error } = await supabase
          .from('whiteboard_drawings')
          .select('*')
          .eq('couple_id', couple.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching drawings:', error);
          return;
        }

        // Convert to the format expected by the widget
        const formattedDrawings = drawings.map(drawing => ({
          id: drawing.id,
          publicUrl: drawing.image_url,
          image: null, // Will load from publicUrl
          canvasWidth: drawing.canvas_width,
          canvasHeight: drawing.canvas_height,
          backgroundColor: drawing.background_color || 'white',
          createdAt: drawing.created_at,
        }));

        console.log('✅ Synced drawings:', formattedDrawings.length);

        // Update AsyncStorage
        await AsyncStorage.setItem('whiteboard_drawings', JSON.stringify(formattedDrawings));
        await AsyncStorage.setItem('savedDrawings', JSON.stringify(formattedDrawings)); // For widget

        // Update the widget
        await updateGalleryWidget();
        console.log('📱 Widget updated with synced drawings');
      } catch (err) {
        console.error('Error syncing drawings:', err);
      }
    }

    // Initial sync
    syncDrawingsFromDatabase();

    // Subscribe to changes
    drawingsSubscription = supabase
      .channel(`whiteboard_drawings_${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'whiteboard_drawings',
          filter: `couple_id=eq.${couple.id}`,
        },
        async (payload) => {
          console.log('🔔 Whiteboard drawing changed:', payload.eventType);
          // Sync drawings when any change occurs
          await syncDrawingsFromDatabase();
        }
      )
      .subscribe((status) => {
        console.log('🔌 Whiteboard subscription status:', status);
      });

    return () => {
      if (drawingsSubscription) {
        drawingsSubscription.unsubscribe();
      }
    };
  }, [couple]);

  // Real-time subscription for widget drawing selection (sync which drawing is set as widget)
  useEffect(() => {
    if (!couple || !isSupabaseConfigured()) return;

    let coupleSubscription;

    async function syncWidgetSelection() {
      try {
        // Fetch current widget selection from couples table
        const { data: coupleData, error } = await supabase
          .from('couples')
          .select('widget_drawing_id')
          .eq('id', couple.id)
          .single();

        if (error) {
          console.error('Error fetching widget selection:', error);
          return;
        }

        if (coupleData?.widget_drawing_id) {
          console.log('🔄 Syncing widget selection:', coupleData.widget_drawing_id);
          await AsyncStorage.setItem('widgetDrawingId', coupleData.widget_drawing_id);
          await updateGalleryWidget();
          console.log('📱 Widget selection synced');
        }
      } catch (err) {
        console.error('Error syncing widget selection:', err);
      }
    }

    // Initial sync
    syncWidgetSelection();

    // Subscribe to widget selection changes
    coupleSubscription = supabase
      .channel(`couple_widget_${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'couples',
          filter: `id=eq.${couple.id}`,
        },
        async (payload) => {
          // Check if widget_drawing_id changed
          if (payload.new?.widget_drawing_id !== payload.old?.widget_drawing_id) {
            console.log('🔔 Widget selection changed:', payload.new.widget_drawing_id);
            await syncWidgetSelection();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Widget selection subscription status:', status);
      });

    return () => {
      if (coupleSubscription) {
        coupleSubscription.unsubscribe();
      }
    };
  }, [couple]);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  async function loadCoupleData() {
    try {
      if (!user) {
        return;
      }

      if (isSupabaseConfigured()) {
        try {
          const { data: coupleData, error } = await supabase
            .from('couples')
            .select('*')
            .or(`auth_user1_id.eq.${user.id},auth_user2_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            console.log('Supabase query error (using local mode):', error.message);
            // Fallback to local mode
            const localCouple = await import('../../lib/storage').then(m => m.getCoupleData());
            if (localCouple) {
              setCouple(localCouple);
            }
          } else if (coupleData && coupleData.length > 0) {
            setCouple(coupleData[0]);
          }
        } catch (error) {
          console.log('Supabase error (using local mode):', error.message);
          // Fallback to local mode
          const localCouple = await import('../../lib/storage').then(m => m.getCoupleData());
          if (localCouple) {
            setCouple(localCouple);
          }
        }
      } else {
        // Local mode
        const localCouple = await import('../../lib/storage').then(m => m.getCoupleData());
        if (localCouple) {
          setCouple(localCouple);
        }
      }
    } catch (error) {
      console.log('Error loading couple data:', error.message);
    }
  }

  async function addHappiness(amount, activity, awardCoins = true) {
    const petData = await getPetData();
    if (!petData) return;

    const newHappiness = Math.min(100, petData.happiness + amount);

    if (isSupabaseConfigured() && couple) {
      try {
        await supabase
          .from('pets')
          .update({ happiness: newHappiness })
          .eq('id', petData.id);
      } catch (error) {
        console.log('Supabase update error (continuing with local mode):', error.message);
      }
    }

    // Update local storage (works in both modes)
    const updatedPet = { ...petData, happiness: newHappiness };
    await savePetData(updatedPet);

    // Award coins only if specified (for winners)
    if (awardCoins) {
      const currency = await getCurrency();
      const newCurrency = currency + 5;
      await saveCurrency(newCurrency);
    }

    // Update streak
    await updateStreak();

    const message = awardCoins
      ? `Your pet gained ${amount} happiness from ${activity}! 🎉\n+5 coins earned!`
      : `Your pet gained ${amount} happiness from ${activity}! 🎉`;
    showAlert('Success!', message);
  }

  async function updateStreak() {
    const streakData = await getStreakData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastDate = null;
    if (streakData.lastActivityDate) {
      lastDate = new Date(streakData.lastActivityDate);
      lastDate.setHours(0, 0, 0, 0);
    }

    const daysDiff = lastDate ? Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)) : null;

    if (daysDiff === null || daysDiff > 0) {
      // First activity or new day
      if (daysDiff === 1 || daysDiff === null) {
        // Continue streak or start new one
        streakData.currentStreak = (streakData.currentStreak || 0) + 1;
      } else if (daysDiff > 1) {
        // Streak broken, start over
        streakData.currentStreak = 1;
      }

      // Update max streak if current streak is higher
      streakData.maxStreak = Math.max(streakData.maxStreak || 0, streakData.currentStreak);

      streakData.lastActivityDate = new Date().toISOString();
      await saveStreakData(streakData);
    }
  }

  // Category Selection View
  if (!selectedCategory) {
    return (
      <LinearGradient colors={theme.gradient} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Choose an Activity</Text>
          <Text style={styles.subtitle}>Keep your streak alive and your pet happy!</Text>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => setSelectedCategory('games')}
          >
            <Text style={styles.categoryEmoji}>🎮</Text>
            <Text style={styles.categoryName}>Games</Text>
            <Text style={styles.categoryDescription}>Play fun games together</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => setSelectedCategory('conversation')}
          >
            <Text style={styles.categoryEmoji}>💬</Text>
            <Text style={styles.categoryName}>Conversation</Text>
            <Text style={styles.categoryDescription}>Fun questions to spark connection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => setSelectedCategory('whiteboard')}
          >
            <Text style={styles.categoryEmoji}>🎨</Text>
            <Text style={styles.categoryName}>Whiteboard</Text>
            <Text style={styles.categoryDescription}>Draw together!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => setSelectedCategory('other')}
          >
            <Text style={styles.categoryEmoji}>✨</Text>
            <Text style={styles.categoryName}>Other</Text>
            <Text style={styles.categoryDescription}>More activities coming soon!</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Activities List View
  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <View style={styles.backButtonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={styles.backButtonText}>← Back to Categories</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {selectedCategory === 'games' && (
          <>
            <Text style={styles.title}>Games</Text>

            <TouchableOpacity
              style={[
                styles.gameCard,
                pendingGames.has('tictactoe') && styles.gameCardPending
              ]}
              onPress={() => setShowTicTacToe(true)}
            >
              <View style={styles.gameCardContent}>
                <Text style={styles.gameEmoji}>❌⭕</Text>
                <Text style={styles.gameName}>Tic Tac Toe</Text>
                <Text style={styles.gameReward}>+5 Happiness</Text>
              </View>
              {pendingGames.has('tictactoe') && (
                <View style={styles.yourTurnBadge}>
                  <Text style={styles.yourTurnText}>Your Turn!</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.gameCard,
                pendingGames.has('dotsandboxes') && styles.gameCardPending
              ]}
              onPress={() => setShowDotsAndBoxes(true)}
            >
              <View style={styles.gameCardContent}>
                <Text style={styles.gameEmoji}>⬛🟦</Text>
                <Text style={styles.gameName}>Dots and Boxes</Text>
                <Text style={styles.gameReward}>+5 Happiness</Text>
              </View>
              {pendingGames.has('dotsandboxes') && (
                <View style={styles.yourTurnBadge}>
                  <Text style={styles.yourTurnText}>Your Turn!</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.gameCard,
                pendingGames.has('connectfour') && styles.gameCardPending
              ]}
              onPress={() => setShowConnectFour(true)}
            >
              <View style={styles.gameCardContent}>
                <Text style={styles.gameEmoji}>🔴🟡</Text>
                <Text style={styles.gameName}>Connect Four</Text>
                <Text style={styles.gameReward}>+5 Happiness</Text>
              </View>
              {pendingGames.has('connectfour') && (
                <View style={styles.yourTurnBadge}>
                  <Text style={styles.yourTurnText}>Your Turn!</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.gameCard,
                pendingGames.has('reversi') && styles.gameCardPending
              ]}
              onPress={() => setShowReversi(true)}
            >
              <View style={styles.gameCardContent}>
                <Text style={styles.gameEmoji}>⚫⚪</Text>
                <Text style={styles.gameName}>Reversi</Text>
                <Text style={styles.gameReward}>+5 Happiness</Text>
              </View>
              {pendingGames.has('reversi') && (
                <View style={styles.yourTurnBadge}>
                  <Text style={styles.yourTurnText}>Your Turn!</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.gameCard,
                pendingGames.has('checkers') && styles.gameCardPending
              ]}
              onPress={() => setShowCheckers(true)}
            >
              <View style={styles.gameCardContent}>
                <Text style={styles.gameEmoji}>⭕⚫</Text>
                <Text style={styles.gameName}>Checkers</Text>
                <Text style={styles.gameReward}>+5 Happiness</Text>
              </View>
              {pendingGames.has('checkers') && (
                <View style={styles.yourTurnBadge}>
                  <Text style={styles.yourTurnText}>Your Turn!</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.gameCard,
                pendingGames.has('memorymatch') && styles.gameCardPending
              ]}
              onPress={() => setShowMemoryMatch(true)}
            >
              <View style={styles.gameCardContent}>
                <Text style={styles.gameEmoji}>🎮🎯</Text>
                <Text style={styles.gameName}>Memory Match</Text>
                <Text style={styles.gameReward}>+5 Happiness</Text>
              </View>
              {pendingGames.has('memorymatch') && (
                <View style={styles.yourTurnBadge}>
                  <Text style={styles.yourTurnText}>Your Turn!</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {selectedCategory === 'conversation' && (
          <>
            <Text style={styles.title}>Conversation</Text>

            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => {
                console.log('🎮 Trivia button clicked!');
                setShowTrivia(true);
                console.log('🎮 setShowTrivia(true) called');
              }}
            >
              <Text style={styles.gameEmoji}>💭❤️</Text>
              <Text style={styles.gameName}>Couple Trivia</Text>
              <Text style={styles.gameReward}>+5 Happiness</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setShowWouldYouRather(true)}
            >
              <Text style={styles.gameEmoji}>🤔💭</Text>
              <Text style={styles.gameName}>Would You Rather</Text>
              <Text style={styles.gameReward}>+5 Happiness</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setShowWhosMoreLikely(true)}
            >
              <Text style={styles.gameEmoji}>👫❓</Text>
              <Text style={styles.gameName}>Who's More Likely To?</Text>
              <Text style={styles.gameReward}>+5 Happiness</Text>
            </TouchableOpacity>
          </>
        )}

        {selectedCategory === 'whiteboard' && (
          <>
            <Text style={styles.title}>Whiteboard</Text>

            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setShowWhiteboard(true)}
            >
              <Text style={styles.gameEmoji}>🎨✏️</Text>
              <Text style={styles.gameName}>Whiteboard</Text>
              <Text style={styles.gameReward}>Draw together!</Text>
            </TouchableOpacity>
          </>
        )}

        {selectedCategory === 'other' && (
          <>
            <Text style={styles.title}>Other Activities</Text>

            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyText}>More activities coming soon!</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Tic Tac Toe Modal */}
      <Modal visible={showTicTacToe} animationType="slide" transparent>
        <TicTacToeGame
          couple={couple}
          userId={userId}
          onClose={() => setShowTicTacToe(false)}
          onTurnComplete={async () => {
            // Refresh pending turns badge immediately after each move
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);
          }}
          onComplete={async (isWinner) => {
            // Refresh pending turns to update badge
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);

            setTimeout(async () => {
              setShowTicTacToe(false);
              addHappiness(5, 'playing Tic Tac Toe', isWinner);
              // Show interstitial ad after game (respects 5-min frequency cap)
              await showAdIfAllowed();
            }, 100);
          }}
        />
      </Modal>

      {/* Trivia Modal */}
      {showTrivia && console.log('🎮 Rendering Trivia Modal - showTrivia:', showTrivia)}
      <Modal visible={showTrivia} animationType="slide">
        {showTrivia && console.log('🎮 Inside Modal - about to render TriviaGame')}
        <TriviaGame
          couple={couple}
          userId={userId}
          onClose={() => {
            console.log('🎮 TriviaGame onClose called');
            setShowTrivia(false);
          }}
          onComplete={() => {
            console.log('🎮 TriviaGame onComplete called');
            setTimeout(async () => {
              setShowTrivia(false);
              addHappiness(5, 'playing Couple Trivia');
              refreshPendingTurns();
              // Show interstitial ad after game (respects 5-min frequency cap)
              await showAdIfAllowed();
            }, 100);
          }}
        />
      </Modal>

      {/* Dots and Boxes Modal */}
      <Modal visible={showDotsAndBoxes} animationType="slide" transparent>
        <DotsAndBoxesGame
          couple={couple}
          userId={userId}
          onClose={() => setShowDotsAndBoxes(false)}
          onTurnComplete={async () => {
            // Refresh pending turns badge immediately after each move
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);
          }}
          onComplete={async (isWinner) => {
            // Refresh pending turns to update badge
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);

            setTimeout(async () => {
              setShowDotsAndBoxes(false);
              addHappiness(5, 'playing Dots and Boxes', isWinner);
              // Show interstitial ad after game (respects 5-min frequency cap)
              await showAdIfAllowed();
            }, 100);
          }}
        />
      </Modal>

      {/* Whiteboard Modal */}
      <Modal visible={showWhiteboard} animationType="slide">
        <WhiteboardGame
          couple={couple}
          userId={userId}
          onClose={() => setShowWhiteboard(false)}
          onComplete={() => {
            setTimeout(() => {
              setShowWhiteboard(false);
              addHappiness(3, 'using the Whiteboard');
            }, 100);
          }}
        />
      </Modal>

      {/* Connect Four Modal */}
      <Modal visible={showConnectFour} animationType="slide" transparent>
        <ConnectFourGame
          couple={couple}
          userId={userId}
          onClose={() => setShowConnectFour(false)}
          onTurnComplete={async () => {
            // Refresh pending turns badge immediately after each move
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);
          }}
          onComplete={async (isWinner) => {
            // Refresh pending turns to update badge
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);

            setTimeout(async () => {
              setShowConnectFour(false);
              addHappiness(5, 'playing Connect Four', isWinner);
              // Show interstitial ad after game (respects 5-min frequency cap)
              await showAdIfAllowed();
            }, 100);
          }}
        />
      </Modal>

      {/* Reversi Modal */}
      <Modal visible={showReversi} animationType="slide" transparent>
        <ReversiGame
          couple={couple}
          userId={userId}
          onClose={() => setShowReversi(false)}
          onTurnComplete={async () => {
            // Refresh pending turns badge immediately after each move
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);
          }}
          onComplete={async (isWinner) => {
            // Refresh pending turns to update badge
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);

            setTimeout(async () => {
              setShowReversi(false);
              addHappiness(5, 'playing Reversi', isWinner);
              // Show interstitial ad after game (respects 5-min frequency cap)
              await showAdIfAllowed();
            }, 100);
          }}
        />
      </Modal>

      {/* Checkers Modal */}
      <Modal visible={showCheckers} animationType="slide" transparent>
        <CheckersGame
          couple={couple}
          userId={userId}
          onClose={() => setShowCheckers(false)}
          onTurnComplete={async () => {
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);
          }}
          onComplete={async (isWinner) => {
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);

            setTimeout(async () => {
              setShowCheckers(false);
              addHappiness(5, 'playing Checkers', isWinner);
              // Show interstitial ad after game (respects 5-min frequency cap)
              await showAdIfAllowed();
            }, 100);
          }}
        />
      </Modal>

      {/* Memory Match Modal */}
      <Modal visible={showMemoryMatch} animationType="slide" transparent>
        <MemoryMatchGame
          couple={couple}
          userId={userId}
          onClose={() => setShowMemoryMatch(false)}
          onTurnComplete={async () => {
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);
          }}
          onComplete={async (isWinner) => {
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            const updatedGameTypes = new Set(updatedTurns.map(game => game.game_type));
            setPendingGames(updatedGameTypes);

            setTimeout(async () => {
              setShowMemoryMatch(false);
              addHappiness(5, 'playing Memory Match', isWinner);
              // Show interstitial ad after game (respects 5-min frequency cap)
              await showAdIfAllowed();
            }, 100);
          }}
        />
      </Modal>

      {/* Would You Rather Modal */}
      <Modal visible={showWouldYouRather} animationType="slide">
        <WouldYouRatherGame
          couple={couple}
          userId={userId}
          onClose={() => setShowWouldYouRather(false)}
          onComplete={() => {
            setTimeout(async () => {
              setShowWouldYouRather(false);
              addHappiness(5, 'playing Would You Rather');
              refreshPendingTurns();
              // Show interstitial ad after game (respects 5-min frequency cap)
              await showAdIfAllowed();
            }, 100);
          }}
        />
      </Modal>

      {/* Who's More Likely Modal */}
      <Modal visible={showWhosMoreLikely} animationType="slide">
        <WhosMoreLikelyGame
          couple={couple}
          userId={userId}
          onClose={() => setShowWhosMoreLikely(false)}
          onComplete={() => {
            setTimeout(async () => {
              setShowWhosMoreLikely(false);
              addHappiness(5, "playing Who's More Likely To");
              refreshPendingTurns();
              // Show interstitial ad after game (respects 5-min frequency cap)
              await showAdIfAllowed();
            }, 100);
          }}
        />
      </Modal>

      {/* Custom Alert Modal */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.customAlertOverlay}>
          <View style={styles.customAlertContainer}>
            <Text style={styles.customAlertTitle}>{customAlert.title}</Text>
            <Text style={styles.customAlertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              style={styles.customAlertButton}
              onPress={() => setCustomAlert({ visible: false, title: '', message: '' })}
            >
              <Text style={styles.customAlertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

export function TicTacToeGame({ couple, userId, onClose, onTurnComplete, onComplete }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState('player1');
  const [winner, setWinner] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState('Partner');
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    initGame();
  }, []);

  async function initGame() {
    if (!couple || !userId) {
      setLoading(false);
      return;
    }

    // Determine which player this user is
    const playerNum = couple.auth_user1_id === userId ? 'player1' : 'player2';
    setMyPlayer(playerNum);
    setPartnerName(playerNum === 'player1' ? 'Player 2' : 'Player 1');

    // Check if there's an active game
    const { data: existingGame } = await supabase
      .from('games')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('game_type', 'tictactoe')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingGame) {
      // Load existing game
      setGameId(existingGame.id);
      setBoard(existingGame.game_state.board);
      setCurrentTurn(existingGame.current_turn);

      // Defer winner update to avoid accessibility state errors
      InteractionManager.runAfterInteractions(() => {
        setWinner(existingGame.winner);
      });
    } else {
      // Create new game - whoever starts gets the first turn
      const newGame = await createGame(
        couple.id,
        'tictactoe',
        { board: Array(9).fill(null) },
        userId
      );

      if (newGame) {
        setGameId(newGame.id);
        setCurrentTurn(newGame.current_turn);
      }
    }

    setLoading(false);
  }

  // Real-time subscription
  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;

    // Poll for updates every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (data && isMounted) {
          setBoard(data.game_state.board);
          setCurrentTurn(data.current_turn);

          // Defer winner update to avoid accessibility state errors
          InteractionManager.runAfterInteractions(() => {
            setWinner(data.winner);
          });
        }
      } catch (error) {
        // Ignore errors during polling (component might be unmounting)
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [gameId]);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  async function handlePress(index) {
    // Check if it's this player's turn
    if (currentTurn !== myPlayer) {
      showAlert('Not Your Turn', "Wait for your partner's move! 💕");
      return;
    }

    if (board[index] || winner) return;

    const newBoard = [...board];
    const symbol = myPlayer === 'player1' ? 'X' : 'O';
    newBoard[index] = symbol;

    const gameWinner = calculateWinner(newBoard);
    const nextTurn = myPlayer === 'player1' ? 'player2' : 'player1';

    // Update in Supabase with notification
    await updateGameState(
      gameId,
      { board: newBoard },
      nextTurn,
      gameWinner,
      userId
    );

    // Refresh badge immediately
    if (onTurnComplete) {
      await onTurnComplete();
    }

    // Local state will be updated via real-time subscription
  }

  function calculateWinner(squares) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];

    for (let line of lines) {
      const [a, b, c] = line;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }

    if (squares.every(square => square !== null)) {
      return 'Draw';
    }

    return null;
  }

  async function reset() {
    if (!gameId) return;

    // Reset the game state
    await supabase
      .from('games')
      .update({
        game_state: { board: Array(9).fill(null) },
        current_turn: 'player1',
        winner: null,
        is_active: true,
      })
      .eq('id', gameId);
  }

  if (loading) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameModalContent}>
          <Text style={styles.gameModalTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  const mySymbol = myPlayer === 'player1' ? 'X' : 'O';
  const isMyTurn = currentTurn === myPlayer;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Tic Tac Toe</Text>

        <Text style={styles.playerInfoText}>
          You are: {mySymbol} | Partner: {partnerName}
        </Text>

        <Text style={[styles.turnText, isMyTurn && styles.myTurnText]}>
          {winner
            ? winner === 'Draw'
              ? "It's a Draw!"
              : `${winner} Wins!`
            : isMyTurn
              ? "Your Turn!"
              : `${partnerName}'s Turn`}
        </Text>

        <View style={styles.board}>
          {board.map((cell, index) => (
            <TouchableOpacity
              key={index}
              style={styles.cell}
              onPress={() => handlePress(index)}
              activeOpacity={!isMyTurn || winner ? 1 : 0.7}
            >
              <Text style={styles.cellText}>{cell}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.gameButtons}>
          <TouchableOpacity style={styles.gameButton} onPress={reset}>
            <Text style={styles.gameButtonText}>New Game</Text>
          </TouchableOpacity>

          {winner && (
            <TouchableOpacity
              style={[styles.gameButton, styles.completeButton]}
              onPress={() => onComplete(winner !== 'Draw' && winner === mySymbol)}
            >
              <Text style={styles.gameButtonText}>Complete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.gameButton, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={styles.gameButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Alert Modal */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.customAlertOverlay}>
          <View style={styles.customAlertContainer}>
            <Text style={styles.customAlertTitle}>{customAlert.title}</Text>
            <Text style={styles.customAlertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              style={styles.customAlertButton}
              onPress={() => setCustomAlert({ visible: false, title: '', message: '' })}
            >
              <Text style={styles.customAlertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function DotsAndBoxesGame({ couple, userId, onClose, onTurnComplete, onComplete }) {
  const gridSize = 4; // 4x4 dots = 3x3 boxes
  const [horizontalLines, setHorizontalLines] = useState(
    Array(gridSize).fill(null).map(() => Array(gridSize - 1).fill(false))
  );
  const [verticalLines, setVerticalLines] = useState(
    Array(gridSize - 1).fill(null).map(() => Array(gridSize).fill(false))
  );
  const [boxes, setBoxes] = useState(
    Array(gridSize - 1).fill(null).map(() => Array(gridSize - 1).fill(null))
  );
  const [currentTurn, setCurrentTurn] = useState('player1');
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [myPlayer, setMyPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState('Partner');
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    initGame();
  }, []);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  async function initGame() {
    if (!couple || !userId) {
      setLoading(false);
      return;
    }

    const playerNum = couple.auth_user1_id === userId ? 'player1' : 'player2';
    setMyPlayer(playerNum);
    setPartnerName(playerNum === 'player1' ? 'Player 2' : 'Player 1');

    const { data: existingGame } = await supabase
      .from('games')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('game_type', 'dotsandboxes')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingGame) {
      setGameId(existingGame.id);
      setHorizontalLines(existingGame.game_state.horizontalLines);
      setVerticalLines(existingGame.game_state.verticalLines);
      setBoxes(existingGame.game_state.boxes);
      setCurrentTurn(existingGame.current_turn);
      setScores(existingGame.game_state.scores);
      setGameOver(existingGame.winner !== null);
    } else {
      const initialState = {
        horizontalLines: Array(gridSize).fill(null).map(() => Array(gridSize - 1).fill(false)),
        verticalLines: Array(gridSize - 1).fill(null).map(() => Array(gridSize).fill(false)),
        boxes: Array(gridSize - 1).fill(null).map(() => Array(gridSize - 1).fill(null)),
        scores: { player1: 0, player2: 0 }
      };

      const { data: newGame } = await supabase
        .from('games')
        .insert({
          couple_id: couple.id,
          game_type: 'dotsandboxes',
          game_state: initialState,
          current_turn: playerNum,
          is_active: true,
        })
        .select()
        .single();

      if (newGame) {
        setGameId(newGame.id);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;

    // Poll for updates every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (data && isMounted) {
          setHorizontalLines(data.game_state.horizontalLines);
          setVerticalLines(data.game_state.verticalLines);
          setBoxes(data.game_state.boxes);
          setCurrentTurn(data.current_turn);
          setScores(data.game_state.scores);

          // Defer game over update to avoid accessibility state errors
          InteractionManager.runAfterInteractions(() => {
            setGameOver(data.winner !== null);
          });
        }
      } catch (error) {
        // Ignore errors during polling (component might be unmounting)
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [gameId]);

  async function handleHorizontalLine(row, col) {
    if (currentTurn !== myPlayer) {
      showAlert('Not Your Turn', "Wait for your partner's move! 💕");
      return;
    }

    if (horizontalLines[row][col] || gameOver) return;

    const newHorizontal = horizontalLines.map(r => [...r]);
    newHorizontal[row][col] = true;

    const result = checkBoxesCompleted(newHorizontal, verticalLines, boxes, scores, row, col, 'horizontal');

    const nextTurn = result.boxesCompleted === 0 ? (currentTurn === 'player1' ? 'player2' : 'player1') : currentTurn;

    const updates = {
      game_state: {
        horizontalLines: newHorizontal,
        verticalLines: verticalLines,
        boxes: result.newBoxes,
        scores: result.newScores
      },
      current_turn: nextTurn,
    };

    if (result.isGameOver) {
      const winner = result.newScores.player1 > result.newScores.player2 ? 'Player 1' :
        result.newScores.player2 > result.newScores.player1 ? 'Player 2' : 'Draw';
      updates.winner = winner;
      updates.is_active = false;
    }

    await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId);

    // Refresh badge immediately
    if (onTurnComplete) {
      await onTurnComplete();
    }
  }

  async function handleVerticalLine(row, col) {
    if (currentTurn !== myPlayer) {
      showAlert('Not Your Turn', "Wait for your partner's move! 💕");
      return;
    }

    if (verticalLines[row][col] || gameOver) return;

    const newVertical = verticalLines.map(r => [...r]);
    newVertical[row][col] = true;

    const result = checkBoxesCompleted(horizontalLines, newVertical, boxes, scores, row, col, 'vertical');

    const nextTurn = result.boxesCompleted === 0 ? (currentTurn === 'player1' ? 'player2' : 'player1') : currentTurn;

    const updates = {
      game_state: {
        horizontalLines: horizontalLines,
        verticalLines: newVertical,
        boxes: result.newBoxes,
        scores: result.newScores
      },
      current_turn: nextTurn,
    };

    if (result.isGameOver) {
      const winner = result.newScores.player1 > result.newScores.player2 ? 'Player 1' :
        result.newScores.player2 > result.newScores.player1 ? 'Player 2' : 'Draw';
      updates.winner = winner;
      updates.is_active = false;
    }

    await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId);

    // Refresh badge immediately
    if (onTurnComplete) {
      await onTurnComplete();
    }
  }

  function checkBoxesCompleted(hLines, vLines, currentBoxes, currentScores, row, col, type) {
    const newBoxes = currentBoxes.map(r => [...r]);
    let completed = 0;
    const playerNum = currentTurn === 'player1' ? 1 : 2;

    if (type === 'horizontal') {
      // Check box above
      if (row > 0) {
        const boxRow = row - 1;
        const boxCol = col;
        if (!currentBoxes[boxRow][boxCol] && isBoxComplete(hLines, vLines, boxRow, boxCol)) {
          newBoxes[boxRow][boxCol] = playerNum;
          completed++;
        }
      }
      // Check box below
      if (row < gridSize - 1) {
        const boxRow = row;
        const boxCol = col;
        if (!currentBoxes[boxRow][boxCol] && isBoxComplete(hLines, vLines, boxRow, boxCol)) {
          newBoxes[boxRow][boxCol] = playerNum;
          completed++;
        }
      }
    } else {
      // Check box left
      if (col > 0) {
        const boxRow = row;
        const boxCol = col - 1;
        if (!currentBoxes[boxRow][boxCol] && isBoxComplete(hLines, vLines, boxRow, boxCol)) {
          newBoxes[boxRow][boxCol] = playerNum;
          completed++;
        }
      }
      // Check box right
      if (col < gridSize - 1) {
        const boxRow = row;
        const boxCol = col;
        if (!currentBoxes[boxRow][boxCol] && isBoxComplete(hLines, vLines, boxRow, boxCol)) {
          newBoxes[boxRow][boxCol] = playerNum;
          completed++;
        }
      }
    }

    const newScores = { ...currentScores };
    if (completed > 0) {
      newScores[currentTurn] += completed;
    }

    // Check if game is over
    const isGameOver = newBoxes.every(row => row.every(box => box !== null));

    return {
      newBoxes,
      newScores,
      boxesCompleted: completed,
      isGameOver
    };
  }

  // Old version for backward compatibility - remove after refactor
  function checkBoxesCompletedOld(hLines, vLines, row, col, type) {
    const result = checkBoxesCompleted(hLines, vLines, boxes, scores, row, col, type);

    if (result.boxesCompleted > 0) {
      setBoxes(result.newBoxes);
      setScores(result.newScores);

      // Check if game is over
      const totalBoxes = (gridSize - 1) * (gridSize - 1);
      if (newScores.player1 + newScores.player2 === totalBoxes) {
        // Defer game over update to avoid accessibility state errors
        InteractionManager.runAfterInteractions(() => {
          setGameOver(true);
        });
      }
    }

    return completed;
  }

  function isBoxComplete(hLines, vLines, boxRow, boxCol) {
    return (
      hLines[boxRow][boxCol] &&     // top
      hLines[boxRow + 1][boxCol] && // bottom
      vLines[boxRow][boxCol] &&     // left
      vLines[boxRow][boxCol + 1]    // right
    );
  }

  async function reset() {
    if (!gameId) return;

    const initialState = {
      horizontalLines: Array(gridSize).fill(null).map(() => Array(gridSize - 1).fill(false)),
      verticalLines: Array(gridSize - 1).fill(null).map(() => Array(gridSize).fill(false)),
      boxes: Array(gridSize - 1).fill(null).map(() => Array(gridSize - 1).fill(null)),
      scores: { player1: 0, player2: 0 }
    };

    await supabase
      .from('games')
      .update({
        game_state: initialState,
        current_turn: 'player1',
        winner: null,
        is_active: true,
      })
      .eq('id', gameId);
  }

  if (loading) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameModalContent}>
          <Text style={styles.gameModalTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  const isMyTurn = currentTurn === myPlayer;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Dots and Boxes</Text>

        <Text style={styles.playerInfoText}>
          You are: {myPlayer === 'player1' ? '🟦 Player 1' : '🟥 Player 2'} | Partner: {partnerName}
        </Text>

        <View style={styles.dotsHeader}>
          <Text style={[styles.dotsPlayer, currentTurn === 'player1' && styles.dotsPlayerActive]}>
            🟦 P1: {scores.player1}
          </Text>
          <Text style={[styles.dotsPlayer, currentTurn === 'player2' && styles.dotsPlayerActive]}>
            🟥 P2: {scores.player2}
          </Text>
        </View>

        {!gameOver ? (
          <Text style={[styles.turnText, isMyTurn && styles.myTurnText]}>
            {isMyTurn ? 'Your Turn!' : `${partnerName}'s Turn`}
          </Text>
        ) : (
          <Text style={styles.dotsWinner}>
            {scores.player1 > scores.player2
              ? '🟦 Player 1 Wins!'
              : scores.player2 > scores.player1
                ? '🟥 Player 2 Wins!'
                : "It's a Tie!"}
          </Text>
        )}

        <View style={styles.dotsGrid}>
          {Array(gridSize).fill(null).map((_, row) => (
            <View key={row}>
              {/* Row of dots and horizontal lines */}
              <View style={styles.dotsRow}>
                {Array(gridSize).fill(null).map((_, col) => (
                  <View key={col} style={styles.dotContainer}>
                    <View style={styles.dot} />
                    {col < gridSize - 1 && (
                      <TouchableOpacity
                        style={styles.horizontalLineContainer}
                        onPress={() => handleHorizontalLine(row, col)}
                        hitSlop={{ top: 15, bottom: 15, left: 5, right: 5 }}
                      >
                        <View
                          style={[
                            styles.horizontalLine,
                            horizontalLines[row][col] && styles.lineActive,
                          ]}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* Row of vertical lines and boxes */}
              {row < gridSize - 1 && (
                <View style={styles.verticalRow}>
                  {Array(gridSize).fill(null).map((_, col) => (
                    <View key={col} style={styles.verticalContainer}>
                      <TouchableOpacity
                        style={styles.verticalLineContainer}
                        onPress={() => handleVerticalLine(row, col)}
                        hitSlop={{ top: 5, bottom: 5, left: 15, right: 15 }}
                      >
                        <View
                          style={[
                            styles.verticalLine,
                            verticalLines[row][col] && styles.lineActive,
                          ]}
                        />
                      </TouchableOpacity>
                      {col < gridSize - 1 && (
                        <View style={styles.boxSpace}>
                          {boxes[row][col] && (
                            <Text style={styles.boxOwner}>
                              {boxes[row][col] === 1 ? '🟦' : '🟥'}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.gameButtons}>
          <TouchableOpacity style={styles.gameButton} onPress={reset}>
            <Text style={styles.gameButtonText}>Reset</Text>
          </TouchableOpacity>

          {gameOver && (
            <TouchableOpacity
              style={[styles.gameButton, styles.completeButton]}
              onPress={() => {
                const isWinner = (myPlayer === 'player1' && scores.player1 > scores.player2) ||
                  (myPlayer === 'player2' && scores.player2 > scores.player1);
                onComplete(isWinner);
              }}
            >
              <Text style={styles.gameButtonText}>Complete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.gameButton, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={styles.gameButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Alert Modal */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.customAlertOverlay}>
          <View style={styles.customAlertContainer}>
            <Text style={styles.customAlertTitle}>{customAlert.title}</Text>
            <Text style={styles.customAlertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              style={styles.customAlertButton}
              onPress={() => setCustomAlert({ visible: false, title: '', message: '' })}
            >
              <Text style={styles.customAlertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function ConnectFourGame({ couple, userId, onClose, onTurnComplete, onComplete }) {
  const ROWS = 6;
  const COLS = 7;
  const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [currentTurn, setCurrentTurn] = useState('player1');
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [myPlayer, setMyPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState('Partner');
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    initGame();
  }, []);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  async function initGame() {
    if (!couple || !userId) {
      setLoading(false);
      return;
    }

    const playerNum = couple.auth_user1_id === userId ? 'player1' : 'player2';
    setMyPlayer(playerNum);
    setPartnerName(playerNum === 'player1' ? 'Player 2' : 'Player 1');

    const { data: existingGame } = await supabase
      .from('games')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('game_type', 'connectfour')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingGame) {
      setGameId(existingGame.id);
      setBoard(existingGame.game_state.board);
      setCurrentTurn(existingGame.current_turn);
      setWinningCells(existingGame.game_state.winningCells || []);

      // Defer winner update to avoid accessibility state errors
      InteractionManager.runAfterInteractions(() => {
        setWinner(existingGame.winner);
      });
    } else {
      const newGame = await createGame(
        couple.id,
        'connectfour',
        { board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)), winningCells: [] },
        userId
      );

      if (newGame) {
        setGameId(newGame.id);
        setCurrentTurn(newGame.current_turn);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;

    // Poll for updates every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (data && isMounted) {
          setBoard(data.game_state.board);
          setCurrentTurn(data.current_turn);
          setWinningCells(data.game_state.winningCells || []);

          // Defer winner update to avoid accessibility state errors
          InteractionManager.runAfterInteractions(() => {
            setWinner(data.winner);
          });
        }
      } catch (error) {
        // Ignore errors during polling (component might be unmounting)
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [gameId]);

  async function dropPiece(col) {
    if (currentTurn !== myPlayer) {
      showAlert('Not Your Turn', "Wait for your partner's move! 💕");
      return;
    }

    if (winner) return;

    // Find the lowest empty row in this column
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === null) {
        row = r;
        break;
      }
    }

    if (row === -1) return; // Column is full

    // Place the piece (player1 = 1, player2 = 2)
    const playerNumber = myPlayer === 'player1' ? 1 : 2;
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = playerNumber;

    // Check for winner
    const winResult = checkWinner(newBoard, row, col, playerNumber);
    const nextTurn = myPlayer === 'player1' ? 'player2' : 'player1';

    let gameWinner = null;
    if (winResult) {
      gameWinner = playerNumber === 1 ? '🔴 Red' : '🟡 Yellow';
    } else if (isBoardFull(newBoard)) {
      gameWinner = 'draw';
    }

    await updateGameState(
      gameId,
      { board: newBoard, winningCells: winResult || [] },
      nextTurn,
      gameWinner,
      userId
    );

    // Refresh badge immediately
    if (onTurnComplete) {
      await onTurnComplete();
    }
  }

  function checkWinner(board, row, col, player) {
    // Check horizontal
    for (let c = 0; c <= COLS - 4; c++) {
      if (board[row][c] === player &&
        board[row][c + 1] === player &&
        board[row][c + 2] === player &&
        board[row][c + 3] === player) {
        return [[row, c], [row, c + 1], [row, c + 2], [row, c + 3]];
      }
    }

    // Check vertical
    for (let r = 0; r <= ROWS - 4; r++) {
      if (board[r][col] === player &&
        board[r + 1][col] === player &&
        board[r + 2][col] === player &&
        board[r + 3][col] === player) {
        return [[r, col], [r + 1, col], [r + 2, col], [r + 3, col]];
      }
    }

    // Check diagonal (bottom-left to top-right)
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (board[r][c] === player &&
          board[r - 1][c + 1] === player &&
          board[r - 2][c + 2] === player &&
          board[r - 3][c + 3] === player) {
          return [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]];
        }
      }
    }

    // Check diagonal (top-left to bottom-right)
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (board[r][c] === player &&
          board[r + 1][c + 1] === player &&
          board[r + 2][c + 2] === player &&
          board[r + 3][c + 3] === player) {
          return [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]];
        }
      }
    }

    return null;
  }

  function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== null));
  }

  async function reset() {
    if (!gameId) return;

    await supabase
      .from('games')
      .update({
        game_state: { board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)), winningCells: [] },
        current_turn: 'player1',
        winner: null,
        is_active: true,
      })
      .eq('id', gameId);
  }

  function isWinningCell(row, col) {
    return winningCells.some(([r, c]) => r === row && c === col);
  }

  if (loading) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameModalContent}>
          <Text style={styles.gameModalTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  const myColor = myPlayer === 'player1' ? '🔴 Red' : '🟡 Yellow';
  const isMyTurn = currentTurn === myPlayer;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Connect Four</Text>

        <Text style={styles.playerInfoText}>
          You are: {myColor} | Partner: {partnerName}
        </Text>

        <Text style={[styles.turnText, isMyTurn && styles.myTurnText]}>
          {winner
            ? winner === 'draw'
              ? "It's a Draw!"
              : `${winner} Wins!`
            : isMyTurn
              ? "Your Turn!"
              : `${partnerName}'s Turn`}
        </Text>

        <View style={styles.connectFourBoard}>
          {board.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.connectFourRow}>
              {row.map((cell, colIndex) => (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.connectFourCell,
                    isWinningCell(rowIndex, colIndex) && styles.connectFourWinningCell,
                  ]}
                  onPress={() => dropPiece(colIndex)}
                  activeOpacity={!isMyTurn || winner ? 1 : 0.7}
                >
                  {cell && (
                    <View style={[
                      styles.connectFourPiece,
                      { backgroundColor: cell === 1 ? theme.primary : '#FFD700' }
                    ]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.gameButtons}>
          <TouchableOpacity style={styles.gameButton} onPress={reset}>
            <Text style={styles.gameButtonText}>New Game</Text>
          </TouchableOpacity>

          {winner && (
            <TouchableOpacity
              style={[styles.gameButton, styles.completeButton]}
              onPress={() => onComplete(winner !== 'draw' && winner === myColor)}
            >
              <Text style={styles.gameButtonText}>Complete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.gameButton, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={styles.gameButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Alert Modal */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.customAlertOverlay}>
          <View style={styles.customAlertContainer}>
            <Text style={styles.customAlertTitle}>{customAlert.title}</Text>
            <Text style={styles.customAlertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              style={styles.customAlertButton}
              onPress={() => setCustomAlert({ visible: false, title: '', message: '' })}
            >
              <Text style={styles.customAlertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function ReversiGame({ couple, userId, onClose, onTurnComplete, onComplete }) {
  const SIZE = 8;

  // Initialize board with starting position
  function initBoard() {
    const board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
    board[3][3] = 2; // White
    board[3][4] = 1; // Black
    board[4][3] = 1; // Black
    board[4][4] = 2; // White
    return board;
  }

  const [board, setBoard] = useState(initBoard());
  const [currentTurn, setCurrentTurn] = useState('player1');
  const [validMoves, setValidMoves] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [scores, setScores] = useState({ black: 2, white: 2 });
  const [myPlayer, setMyPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState('Partner');
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    initGame();
  }, []);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  async function initGame() {
    if (!couple || !userId) {
      setLoading(false);
      return;
    }

    const playerNum = couple.auth_user1_id === userId ? 'player1' : 'player2';
    setMyPlayer(playerNum);
    setPartnerName(playerNum === 'player1' ? 'Player 2' : 'Player 1');

    const { data: existingGame } = await supabase
      .from('games')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('game_type', 'reversi')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingGame) {
      setGameId(existingGame.id);
      setBoard(existingGame.game_state.board);
      setCurrentTurn(existingGame.current_turn);
      setGameOver(existingGame.winner !== null);
      setScores(existingGame.game_state.scores || { black: 2, white: 2 });
    } else {
      const { data: newGame } = await supabase
        .from('games')
        .insert({
          couple_id: couple.id,
          game_type: 'reversi',
          game_state: { board: initBoard(), scores: { black: 2, white: 2 } },
          current_turn: playerNum,
          is_active: true,
        })
        .select()
        .single();

      if (newGame) {
        setGameId(newGame.id);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;

    // Poll for updates every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (data && isMounted) {
          setBoard(data.game_state.board);
          setCurrentTurn(data.current_turn);
          setScores(data.game_state.scores || { black: 2, white: 2 });

          // Defer game over update to avoid accessibility state errors
          InteractionManager.runAfterInteractions(() => {
            setGameOver(data.winner !== null);
          });
        }
      } catch (error) {
        // Ignore errors during polling (component might be unmounting)
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [gameId]);

  useEffect(() => {
    if (!myPlayer) return;

    const playerNumber = currentTurn === 'player1' ? 1 : 2;
    const moves = getValidMoves(board, playerNumber);
    setValidMoves(moves);

    if (moves.length === 0 && !gameOver) {
      // Current player has no moves, check if opponent has moves
      const opponentMoves = getValidMoves(board, playerNumber === 1 ? 2 : 1);
      if (opponentMoves.length === 0) {
        // Game over - calculate winner
        calculateScoresAndEnd();
      } else {
        // Pass turn
        passTurn();
      }
    }
  }, [board, currentTurn, myPlayer]);

  useEffect(() => {
    calculateScores();
  }, [board]);

  async function passTurn() {
    if (!gameId) return;

    const nextTurn = currentTurn === 'player1' ? 'player2' : 'player1';
    await supabase
      .from('games')
      .update({ current_turn: nextTurn })
      .eq('id', gameId);

    // Refresh badge immediately
    if (onTurnComplete) {
      await onTurnComplete();
    }
  }

  async function calculateScoresAndEnd() {
    let black = 0;
    let white = 0;
    board.forEach(row => {
      row.forEach(cell => {
        if (cell === 1) black++;
        if (cell === 2) white++;
      });
    });

    const winner = black > white ? 'Black' : white > black ? 'White' : 'Draw';

    await supabase
      .from('games')
      .update({
        winner: winner,
        is_active: false,
        game_state: { board, scores: { black, white } }
      })
      .eq('id', gameId);
  }

  function getValidMoves(board, player) {
    const moves = [];
    const opponent = player === 1 ? 2 : 1;
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col] !== null) continue;

        let isValid = false;
        for (const [dr, dc] of directions) {
          let r = row + dr;
          let c = col + dc;
          let foundOpponent = false;

          while (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
            if (board[r][c] === null) break;
            if (board[r][c] === opponent) {
              foundOpponent = true;
              r += dr;
              c += dc;
            } else if (board[r][c] === player) {
              if (foundOpponent) {
                isValid = true;
              }
              break;
            }
          }
          if (isValid) break;
        }

        if (isValid) {
          moves.push([row, col]);
        }
      }
    }
    return moves;
  }

  function getPiecesToFlip(board, row, col, player) {
    const opponent = player === 1 ? 2 : 1;
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];
    const toFlip = [];

    for (const [dr, dc] of directions) {
      const flipped = [];
      let r = row + dr;
      let c = col + dc;

      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
        if (board[r][c] === null) break;
        if (board[r][c] === opponent) {
          flipped.push([r, c]);
          r += dr;
          c += dc;
        } else if (board[r][c] === player) {
          toFlip.push(...flipped);
          break;
        }
      }
    }
    return toFlip;
  }

  async function placePiece(row, col) {
    if (currentTurn !== myPlayer) {
      showAlert('Not Your Turn', "Wait for your partner's move! 💕");
      return;
    }

    if (gameOver) return;
    if (!validMoves.some(([r, c]) => r === row && c === col)) return;

    const playerNumber = myPlayer === 'player1' ? 1 : 2;
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = playerNumber;

    const toFlip = getPiecesToFlip(board, row, col, playerNumber);
    toFlip.forEach(([r, c]) => {
      newBoard[r][c] = playerNumber;
    });

    // Calculate new scores
    let black = 0;
    let white = 0;
    newBoard.forEach(row => {
      row.forEach(cell => {
        if (cell === 1) black++;
        if (cell === 2) white++;
      });
    });

    const nextTurn = myPlayer === 'player1' ? 'player2' : 'player1';

    await supabase
      .from('games')
      .update({
        game_state: { board: newBoard, scores: { black, white } },
        current_turn: nextTurn,
      })
      .eq('id', gameId);

    // Refresh badge immediately
    if (onTurnComplete) {
      await onTurnComplete();
    }
  }

  function calculateScores() {
    let black = 0;
    let white = 0;
    board.forEach(row => {
      row.forEach(cell => {
        if (cell === 1) black++;
        if (cell === 2) white++;
      });
    });
    setScores({ black, white });
  }

  async function reset() {
    if (!gameId) return;

    await supabase
      .from('games')
      .update({
        game_state: { board: initBoard(), scores: { black: 2, white: 2 } },
        current_turn: 'player1',
        winner: null,
        is_active: true,
      })
      .eq('id', gameId);
  }

  function isValidMove(row, col) {
    return validMoves.some(([r, c]) => r === row && c === col);
  }

  if (loading) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameModalContent}>
          <Text style={styles.gameModalTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  const myColor = myPlayer === 'player1' ? '⚫ Black' : '⚪ White';
  const isMyTurn = currentTurn === myPlayer;

  return (
    <View style={styles.modalContainer}>
      <ScrollView contentContainerStyle={styles.reversiScrollContent}>
        <View style={styles.reversiContent}>
          <Text style={styles.gameModalTitle}>Reversi</Text>

          <Text style={styles.playerInfoText}>
            You are: {myColor} | Partner: {partnerName}
          </Text>

          <View style={styles.reversiHeader}>
            <View style={styles.reversiPlayerScore}>
              <Text style={styles.reversiScoreLabel}>⚫ Black</Text>
              <Text style={styles.reversiScoreValue}>{scores.black}</Text>
            </View>
            <View style={styles.reversiPlayerScore}>
              <Text style={styles.reversiScoreLabel}>⚪ White</Text>
              <Text style={styles.reversiScoreValue}>{scores.white}</Text>
            </View>
          </View>

          {!gameOver ? (
            <Text style={[styles.turnText, isMyTurn && styles.myTurnText]}>
              {isMyTurn ? 'Your Turn!' : `${partnerName}'s Turn`}
            </Text>
          ) : (
            <Text style={styles.turnText}>
              {scores.black > scores.white
                ? '⚫ Black Wins!'
                : scores.white > scores.black
                  ? '⚪ White Wins!'
                  : "It's a Tie!"}
            </Text>
          )}

          <View style={styles.reversiBoard}>
            {board.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.reversiRow}>
                {row.map((cell, colIndex) => (
                  <TouchableOpacity
                    key={colIndex}
                    style={[
                      styles.reversiCell,
                      isValidMove(rowIndex, colIndex) && styles.reversiValidCell,
                    ]}
                    onPress={() => placePiece(rowIndex, colIndex)}
                    activeOpacity={!isMyTurn || gameOver ? 1 : 0.7}
                  >
                    {cell && (
                      <View style={[
                        styles.reversiPiece,
                        { backgroundColor: cell === 1 ? '#333' : '#FFF' },
                        cell === 2 && { borderWidth: 1, borderColor: '#CCC' }
                      ]} />
                    )}
                    {isValidMove(rowIndex, colIndex) && !cell && (
                      <View style={styles.reversiHint} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.gameButtons}>
            <TouchableOpacity style={styles.gameButton} onPress={reset}>
              <Text style={styles.gameButtonText}>Reset</Text>
            </TouchableOpacity>

            {gameOver && (
              <TouchableOpacity
                style={[styles.gameButton, styles.completeButton]}
                onPress={() => {
                  const isWinner = (myPlayer === 'player1' && scores.black > scores.white) ||
                    (myPlayer === 'player2' && scores.white > scores.black);
                  onComplete(isWinner);
                }}
              >
                <Text style={styles.gameButtonText}>Complete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.gameButton, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.gameButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Custom Alert Modal */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.customAlertOverlay}>
          <View style={styles.customAlertContainer}>
            <Text style={styles.customAlertTitle}>{customAlert.title}</Text>
            <Text style={styles.customAlertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              style={styles.customAlertButton}
              onPress={() => setCustomAlert({ visible: false, title: '', message: '' })}
            >
              <Text style={styles.customAlertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function WhiteboardGame({ couple, userId, onClose, onComplete }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [currentTab, setCurrentTab] = useState('canvas');
  const [currentColor, setCurrentColor] = useState(theme.primary);
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('white');
  const [savedDrawings, setSavedDrawings] = useState([]);
  const [widgetDrawingId, setWidgetDrawingId] = useState(null);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushSizePicker, setShowBrushSizePicker] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const canvasRef = useRef(null);

  const colors = [
    '#FF1493', '#FF69B4', '#FFB6D9', '#FFF0F5',
    '#FF0000', '#FF6B00', '#FFD700', '#00FF00',
    '#00BFFF', '#0000FF', '#8A2BE2', '#FF00FF',
    '#000000', '#808080', '#FFFFFF', '#8B4513'
  ];

  const backgroundColors = [
    '#FFFFFF', '#FFF0F5', '#FFE5EC', '#FFB6D9',
    '#FF69B4', '#FF1493', '#FF0000', '#FFD700',
    '#00FF00', '#00BFFF', '#0000FF', '#8A2BE2',
    '#FF00FF', '#000000', '#808080', '#F5F5F5'
  ];

  useEffect(() => {
    loadSavedDrawings();
  }, []);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  async function loadSavedDrawings() {
    try {
      if (isSupabaseConfigured() && couple) {
        console.log('📂 Loading drawings from Supabase for couple:', couple.id);
        // Load from Supabase
        const { data: drawings, error } = await supabase
          .from('whiteboard_drawings')
          .select('*')
          .eq('couple_id', couple.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error loading drawings from Supabase:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
        }

        if (!error && drawings) {
          console.log(`✅ Loaded ${drawings.length} drawings from Supabase`);
          const formattedDrawings = drawings.map(d => ({
            id: d.id,
            image: null, // Will be loaded on demand
            publicUrl: d.image_url,
            canvasWidth: d.canvas_width,
            canvasHeight: d.canvas_height,
            backgroundColor: d.background_color,
            createdAt: d.created_at,
          }));
          setSavedDrawings(formattedDrawings);
          console.log('Drawing IDs:', formattedDrawings.map(d => d.id));
        } else if (!error && !drawings) {
          console.log('⚠️ No drawings found in database');
        }

        // Get widget drawing ID from couple
        const { data: coupleData } = await supabase
          .from('couples')
          .select('widget_drawing_id')
          .eq('id', couple.id)
          .single();

        if (coupleData?.widget_drawing_id) {
          setWidgetDrawingId(coupleData.widget_drawing_id);
        }
      } else {
        // Fallback to local storage
        const drawings = await AsyncStorage.getItem('whiteboard_drawings');
        if (drawings) {
          setSavedDrawings(JSON.parse(drawings));
        }
        const widgetId = await AsyncStorage.getItem('widgetDrawingId');
        if (widgetId) {
          setWidgetDrawingId(widgetId);
        }
      }
    } catch (error) {
      console.error('Error loading drawings:', error);
    }
  }

  async function setAsWidgetDrawing(drawingId) {
    try {
      console.log('Setting widget drawing ID:', drawingId);

      // Find the drawing
      const drawing = savedDrawings.find(d => d.id === drawingId);
      if (!drawing) {
        showAlert('Error', 'Drawing not found');
        return;
      }

      if (isSupabaseConfigured() && couple) {
        // Update widget drawing ID in couples table (synced for both users)
        const { error } = await supabase
          .from('couples')
          .update({ widget_drawing_id: drawingId })
          .eq('id', couple.id);

        if (error) {
          console.error('Error updating widget in database:', error);
        }
      }

      // Also save to local storage for widget to use
      await AsyncStorage.setItem('widgetDrawingId', drawingId);
      setWidgetDrawingId(drawingId);

      // Wait a bit for storage to complete before updating widget
      setTimeout(async () => {
        await updateGalleryWidget();
        console.log('Widget update complete');
      }, 500);

      showAlert('Success!', 'Drawing set as widget for both of you! The widget should update shortly.');
    } catch (error) {
      console.error('Error setting widget drawing:', error);
      showAlert('Error', 'Failed to set widget drawing');
    }
  }

  function clearCanvas() {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  }

  function undoLastStroke() {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  }

  function toggleEraser() {
    setIsEraser(!isEraser);
  }

  async function saveDrawing() {
    if (!canvasRef.current || canvasRef.current.isEmpty()) {
      showAlert('Empty Canvas', 'Draw something first!');
      return;
    }

    try {
      // Export canvas as base64 image with dimensions
      const imageData = await canvasRef.current.exportAsImage();

      if (!imageData || !imageData.base64) {
        showAlert('Error', 'Failed to export drawing');
        return;
      }

      const drawingId = Date.now().toString();
      let publicUrl = null;

      // Upload to Supabase Storage if configured
      if (isSupabaseConfigured()) {
        try {
          console.log('Uploading drawing to Supabase storage...');

          const fileName = `drawings/${drawingId}.png`;

          // Decode base64 to binary
          const binaryString = atob(imageData.base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          console.log('Binary data size:', bytes.length, 'bytes');

          // Upload to Supabase storage using ArrayBuffer
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('widget-images')
            .upload(fileName, bytes.buffer, {
              contentType: 'image/png',
              upsert: false,
            });

          if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            console.error('Error message:', uploadError.message);
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('widget-images')
              .getPublicUrl(fileName);

            publicUrl = urlData.publicUrl;
            console.log('Upload successful!');
            console.log('Public URL:', publicUrl);

            // Save to database if couple is available
            if (couple && publicUrl) {
              const { error: dbError } = await supabase
                .from('whiteboard_drawings')
                .insert({
                  id: drawingId,
                  couple_id: couple.id,
                  image_url: publicUrl,
                  canvas_width: Math.round(imageData.width),
                  canvas_height: Math.round(imageData.height),
                  background_color: backgroundColor,
                  created_by: userId,
                });

              if (dbError) {
                console.error('Error saving to database:', dbError);
              } else {
                console.log('Drawing saved to database!');
              }
            }
          }
        } catch (uploadError) {
          console.error('Error uploading to Supabase:', uploadError);
          console.error('Error message:', uploadError.message);
        }
      }

      // Also save locally as fallback
      const fileName = `drawing_${drawingId}.png`;
      const file = new File(Paths.document, fileName);
      await file.write(imageData.base64, { encoding: 'base64' });
      const localPath = file.uri.replace('file://', '');

      const newDrawing = {
        id: drawingId,
        image: imageData.base64, // Keep base64 for gallery display
        fileUri: localPath, // Local file path as fallback
        publicUrl: publicUrl, // Supabase public URL for widget
        canvasWidth: imageData.width,
        canvasHeight: imageData.height,
        backgroundColor: backgroundColor,
        createdAt: new Date().toISOString(),
      };

      const updatedDrawings = [newDrawing, ...savedDrawings];
      setSavedDrawings(updatedDrawings);

      // Save to storage
      await AsyncStorage.setItem('whiteboard_drawings', JSON.stringify(updatedDrawings));
      await AsyncStorage.setItem('savedDrawings', JSON.stringify(updatedDrawings)); // For widget
      updateGalleryWidget(); // Update widget

      showAlert('Success!', 'Drawing saved to gallery and shared with your partner!');

      // Clear canvas and switch to gallery tab
      canvasRef.current.clear();
      setCurrentTab('gallery');
    } catch (error) {
      console.error('Save error:', error);
      showAlert('Error', 'Failed to save drawing');
    }
  }

  async function deleteDrawing(drawingId) {
    Alert.alert(
      'Delete Drawing',
      'Are you sure you want to delete this drawing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Find the drawing to get its file URI
            const drawingToDelete = savedDrawings.find(d => d.id === drawingId);

            const updatedDrawings = savedDrawings.filter(drawing => drawing.id !== drawingId);
            setSavedDrawings(updatedDrawings);

            try {
              // Delete from Supabase storage and database if it exists
              if (drawingToDelete?.publicUrl && isSupabaseConfigured()) {
                try {
                  const fileName = `drawings/${drawingToDelete.id}.png`;
                  const { error: deleteError } = await supabase.storage
                    .from('widget-images')
                    .remove([fileName]);

                  if (deleteError) {
                    console.error('Supabase delete error:', deleteError);
                  } else {
                    console.log('Deleted from Supabase storage:', fileName);
                  }

                  // Also delete from database
                  if (couple) {
                    const { error: dbDeleteError } = await supabase
                      .from('whiteboard_drawings')
                      .delete()
                      .eq('id', drawingId);

                    if (dbDeleteError) {
                      console.error('Database delete error:', dbDeleteError);
                    } else {
                      console.log('Deleted from database:', drawingId);
                    }
                  }
                } catch (supabaseError) {
                  console.error('Error deleting from Supabase:', supabaseError);
                }
              }

              // Delete local file if it exists
              if (drawingToDelete?.fileUri) {
                try {
                  const file = new File(drawingToDelete.fileUri);
                  if (await file.exists()) {
                    await file.delete();
                    console.log('Deleted local file:', drawingToDelete.fileUri);
                  }
                } catch (fileError) {
                  console.error('Error deleting file:', fileError);
                  // Continue anyway to delete from storage
                }
              }

              await AsyncStorage.setItem('whiteboard_drawings', JSON.stringify(updatedDrawings));
              await AsyncStorage.setItem('savedDrawings', JSON.stringify(updatedDrawings)); // For widget
              updateGalleryWidget(); // Update widget
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete drawing');
            }
          },
        },
      ]
    );
  }

  function renderPath(pathData, index, scaleX = 1, scaleY = 1) {
    const { path, color, size = 4 } = pathData;
    if (path.length === 0) return null;

    const circles = [];

    // Draw circles at each point and interpolate between points for smooth lines
    for (let i = 0; i < path.length; i++) {
      const point = path[i];

      // Scale coordinates
      const scaledX = point.x * scaleX;
      const scaledY = point.y * scaleY;

      // Draw circle at current point
      circles.push(
        <View
          key={`${index}-${i}`}
          style={{
            position: 'absolute',
            left: scaledX - size / 2,
            top: scaledY - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          }}
        />
      );

      // Interpolate between current and next point
      if (i < path.length - 1) {
        const nextPoint = path[i + 1];
        const scaledNextX = nextPoint.x * scaleX;
        const scaledNextY = nextPoint.y * scaleY;
        const distance = Math.sqrt(
          Math.pow(scaledNextX - scaledX, 2) + Math.pow(scaledNextY - scaledY, 2)
        );

        // Scale max interpolation distance based on brush size
        const maxInterpolationDistance = Math.max(100, size * 5);

        // Interpolate if points aren't too far apart (prevents connecting distant points)
        if (distance > 1 && distance < maxInterpolationDistance) {
          // Dense interpolation for solid lines - circles overlap by ~65%
          // Place circles every 35% of brush size for crisp solid appearance
          const spacing = size * 0.35;
          const steps = Math.max(1, Math.ceil(distance / spacing));

          for (let step = 1; step < steps; step++) {
            const t = step / steps;
            const interpolatedX = scaledX + (scaledNextX - scaledX) * t;
            const interpolatedY = scaledY + (scaledNextY - scaledY) * t;

            circles.push(
              <View
                key={`${index}-${i}-interp-${step}`}
                style={{
                  position: 'absolute',
                  left: interpolatedX - size / 2,
                  top: interpolatedY - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: color,
                }}
              />
            );
          }
        }
      }
    }

    return circles;
  }

  return (
    <SafeAreaView style={styles.whiteboardContainer}>
      <View style={styles.whiteboardHeader}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.whiteboardBackButton}>✕</Text>
        </TouchableOpacity>

        <View style={styles.whiteboardTabs}>
          <TouchableOpacity onPress={() => setCurrentTab('canvas')}>
            <Text style={[styles.whiteboardTab, currentTab === 'canvas' && styles.whiteboardTabActive]}>
              Canvas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentTab('gallery')}>
            <Text style={[styles.whiteboardTab, currentTab === 'gallery' && styles.whiteboardTabActive]}>
              Gallery
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {currentTab === 'canvas' ? (
        <>
          <View style={styles.whiteboardControls}>
            <View style={styles.whiteboardControlLeft}>
              <TouchableOpacity style={styles.whiteboardControlButton} onPress={clearCanvas}>
                <Text style={styles.whiteboardControlText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.whiteboardControlButton} onPress={undoLastStroke}>
                <Text style={styles.whiteboardControlText}>Undo</Text>
              </TouchableOpacity>

              {/* Color Selector Button */}
              <TouchableOpacity
                style={styles.colorSelectorButton}
                onPress={() => setShowColorPicker(true)}
              >
                <View style={[styles.colorSelectorCircle, { backgroundColor: currentColor }]}>
                  {(currentColor === '#FFFFFF' || currentColor === '#FFF0F5') && (
                    <View style={styles.colorSelectorBorder} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Brush Size Selector Button */}
              <TouchableOpacity
                style={styles.brushSizeButton}
                onPress={() => setShowBrushSizePicker(true)}
              >
                <View style={styles.brushSizeCircle}>
                  <View style={[styles.brushSizePreview, {
                    width: Math.max(8, brushSize),
                    height: Math.max(8, brushSize),
                    borderRadius: Math.max(4, brushSize / 2),
                    backgroundColor: isEraser ? theme.backgroundSecondary : currentColor
                  }]} />
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.whiteboardSaveButton} onPress={saveDrawing}>
              <Text style={styles.whiteboardSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <SkiaDrawingCanvas
            ref={canvasRef}
            backgroundColor={backgroundColor}
            strokeColor={isEraser ? backgroundColor : currentColor}
            strokeWidth={brushSize}
          />

          {/* Tool Selection */}
          <View style={styles.whiteboardToolBar}>
            <TouchableOpacity
              style={[styles.whiteboardToolButton, !isEraser && styles.whiteboardToolButtonActive]}
              onPress={() => setIsEraser(false)}
            >
              <Text style={[styles.whiteboardToolText, !isEraser && { color: 'white' }]}>Draw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.whiteboardToolButton, isEraser && styles.whiteboardToolButtonActive]}
              onPress={toggleEraser}
            >
              <Text style={[styles.whiteboardToolText, isEraser && { color: 'white' }]}>Eraser</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ScrollView style={styles.whiteboardGallery} contentContainerStyle={styles.whiteboardGalleryContent}>
          {savedDrawings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎨</Text>
              <Text style={styles.emptyText}>No drawings yet!</Text>
              <Text style={styles.emptySubtext}>Create and save drawings to see them here</Text>
            </View>
          ) : (
            savedDrawings.map((drawing) => {
              // Calculate uniform scale to maintain aspect ratio
              const targetSize = 350; // Approximate gallery canvas width
              const scaleX = drawing.canvasWidth ? targetSize / drawing.canvasWidth : 1;
              const scaleY = drawing.canvasHeight ? targetSize / drawing.canvasHeight : 1;
              const scale = Math.min(scaleX, scaleY); // Use minimum to fit entire drawing

              return (
                <View key={drawing.id} style={styles.whiteboardGalleryItem}>
                  <TouchableOpacity
                    onPress={() => setSelectedDrawing(drawing)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.whiteboardGalleryCanvas,
                      { backgroundColor: drawing.backgroundColor || 'white' }
                    ]}>
                      {drawing.image ? (
                        <Image
                          source={{ uri: `data:image/png;base64,${drawing.image}` }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="contain"
                        />
                      ) : drawing.publicUrl ? (
                        <Image
                          source={{ uri: drawing.publicUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="contain"
                        />
                      ) : (
                        drawing.paths?.map((pathData, index) => renderPath(pathData, index, scale, scale))
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.whiteboardGalleryFooter}>
                    <Text style={styles.whiteboardGalleryDate}>
                      {new Date(drawing.createdAt).toLocaleDateString()}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[
                          styles.whiteboardWidgetButton,
                          widgetDrawingId === drawing.id && styles.whiteboardWidgetButtonActive
                        ]}
                        onPress={() => setAsWidgetDrawing(drawing.id)}
                      >
                        <Text style={[
                          styles.whiteboardWidgetText,
                          widgetDrawingId === drawing.id && { color: 'white' }
                        ]}>
                          {widgetDrawingId === drawing.id ? '✓ Widget' : 'Set Widget'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.whiteboardDeleteButton}
                        onPress={() => deleteDrawing(drawing.id)}
                      >
                        <Text style={styles.whiteboardDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Custom Alert Modal */}
      <Modal visible={customAlert.visible} transparent animationType="fade">
        <View style={styles.customAlertOverlay}>
          <View style={styles.customAlertContainer}>
            <Text style={styles.customAlertTitle}>{customAlert.title}</Text>
            <Text style={styles.customAlertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              style={styles.customAlertButton}
              onPress={() => setCustomAlert({ visible: false, title: '', message: '' })}
            >
              <Text style={styles.customAlertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal visible={showColorPicker} transparent animationType="slide">
        <View style={styles.colorPickerOverlay}>
          <View style={styles.colorPickerContainer}>
            <View style={styles.colorPickerHeader}>
              <Text style={styles.colorPickerTitle}>Colors</Text>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Text style={styles.colorPickerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Brush Color Section */}
            <View style={styles.colorPickerSection}>
              <Text style={styles.colorPickerSectionTitle}>Brush Color</Text>
              <View style={styles.colorPickerGrid}>
                {colors.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorPickerCircle,
                      { backgroundColor: color },
                      color === currentColor && styles.colorPickerCircleActive,
                      (color === '#FFFFFF' || color === '#FFF0F5') && { borderWidth: 2, borderColor: '#FFB6D9' },
                    ]}
                    onPress={() => {
                      setCurrentColor(color);
                      setIsEraser(false);
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Background Color Section */}
            <View style={styles.colorPickerSection}>
              <Text style={styles.colorPickerSectionTitle}>Canvas Color</Text>
              <View style={styles.colorPickerGrid}>
                {backgroundColors.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorPickerCircle,
                      { backgroundColor: color },
                      color === backgroundColor && styles.colorPickerCircleActive,
                      (color === '#FFFFFF' || color === '#FFF0F5') && { borderWidth: 2, borderColor: '#FFB6D9' },
                    ]}
                    onPress={() => setBackgroundColor(color)}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.colorPickerDoneButton}
              onPress={() => setShowColorPicker(false)}
            >
              <Text style={styles.colorPickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Brush Size Picker Modal */}
      <Modal visible={showBrushSizePicker} transparent animationType="slide">
        <View style={styles.colorPickerOverlay}>
          <View style={styles.colorPickerContainer}>
            <View style={styles.colorPickerHeader}>
              <Text style={styles.colorPickerTitle}>Brush Size</Text>
              <TouchableOpacity onPress={() => setShowBrushSizePicker(false)}>
                <Text style={styles.colorPickerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.brushSizePickerSection}>
              <View style={styles.brushSizePreviewLarge}>
                <View style={[styles.brushSizePreview, {
                  width: Math.max(8, brushSize),
                  height: Math.max(8, brushSize),
                  borderRadius: Math.max(4, brushSize / 2),
                  backgroundColor: isEraser ? theme.backgroundSecondary : currentColor
                }]} />
              </View>
              <Text style={styles.brushSizeValue}>{brushSize}px</Text>
              <CustomSlider
                style={styles.brushSizeSlider}
                minimumValue={2}
                maximumValue={30}
                step={1}
                value={brushSize}
                onValueChange={setBrushSize}
              />
            </View>

            <TouchableOpacity
              style={styles.colorPickerDoneButton}
              onPress={() => setShowBrushSizePicker(false)}
            >
              <Text style={styles.colorPickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full Screen Drawing Viewer Modal */}
      <Modal visible={selectedDrawing !== null} transparent animationType="fade">
        <View style={styles.drawingViewerOverlay}>
          <TouchableOpacity
            style={styles.drawingViewerClose}
            onPress={() => setSelectedDrawing(null)}
          >
            <Text style={styles.drawingViewerCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedDrawing && (
            <View style={[
              styles.drawingViewerCanvas,
              { backgroundColor: selectedDrawing.backgroundColor || 'white' }
            ]}>
              {selectedDrawing.image ? (
                <Image
                  source={{ uri: `data:image/png;base64,${selectedDrawing.image}` }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : selectedDrawing.publicUrl ? (
                <Image
                  source={{ uri: selectedDrawing.publicUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : (
                selectedDrawing.paths?.map((pathData, index) => {
                  const viewerSize = 350;
                  const scaleX = selectedDrawing.canvasWidth ? viewerSize / selectedDrawing.canvasWidth : 1;
                  const scaleY = selectedDrawing.canvasHeight ? viewerSize / selectedDrawing.canvasHeight : 1;
                  const scale = Math.min(scaleX, scaleY);
                  return renderPath(pathData, index, scale, scale);
                })
              )}
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export function CheckersGame({ couple, userId, onClose, onTurnComplete, onComplete }) {
  const [board, setBoard] = useState(initCheckersBoard());
  const [currentTurn, setCurrentTurn] = useState('player1');
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState(null);
  const [partnerName, setPartnerName] = useState('Partner');

  function initCheckersBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    // Setup player1 pieces (top, red)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { player: 'player1', isKing: false };
        }
      }
    }
    // Setup player2 pieces (bottom, black)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { player: 'player2', isKing: false };
        }
      }
    }
    return board;
  }

  useEffect(() => {
    async function loadGame() {
      const player = couple.auth_user1_id === userId ? 'player1' : 'player2';
      setMyPlayer(player);

      const partner = couple.auth_user1_id === userId ? couple.auth_user2_id : couple.auth_user1_id;
      setPartnerName(partner ? 'Partner' : 'Partner');

      const existingGame = await getActiveGame(couple.id, 'checkers');
      if (existingGame) {
        setGameId(existingGame.id);
        setBoard(existingGame.game_state.board);
        setCurrentTurn(existingGame.current_turn);
        setTimeout(() => setWinner(existingGame.winner), 100);
      } else {
        const newGame = await createGame(couple.id, 'checkers', { board: initCheckersBoard() }, userId);
        if (newGame) {
          setGameId(newGame.id);
        }
      }
      setLoading(false);
    }
    loadGame();
  }, []);

  // Subscribe to real-time game updates
  useEffect(() => {
    if (!gameId) return;

    const subscription = supabase
      .channel(`game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('🎮 Checkers game update received:', payload.new);
          const updated = payload.new;
          setBoard(updated.game_state.board);
          setCurrentTurn(updated.current_turn);
          setSelectedPiece(null); // Clear selected piece on any update
          if (updated.winner) {
            setWinner(updated.winner);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [gameId]);

  function getValidMoves(row, col, piece, boardState = board, jumpsOnly = false) {
    const moves = [];
    const directions = piece.isKing ?
      [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
      piece.player === 'player1' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        if (!boardState[newRow][newCol] && !jumpsOnly) {
          moves.push({ row: newRow, col: newCol, isJump: false });
        } else if (boardState[newRow][newCol] && boardState[newRow][newCol].player !== piece.player) {
          const jumpRow = newRow + dr;
          const jumpCol = newCol + dc;
          if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 && !boardState[jumpRow][jumpCol]) {
            moves.push({ row: jumpRow, col: jumpCol, isJump: true, captureRow: newRow, captureCol: newCol });
          }
        }
      }
    }
    return moves;
  }

  function hasAnyJumps(boardState, player) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState[row][col];
        if (piece && piece.player === player) {
          const moves = getValidMoves(row, col, piece, boardState, true);
          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  }

  async function handleSquarePress(row, col) {
    if (currentTurn !== myPlayer || winner) return;

    if (selectedPiece) {
      const jumpsAvailable = hasAnyJumps(board, myPlayer);
      const validMoves = getValidMoves(selectedPiece.row, selectedPiece.col, selectedPiece.piece, board, jumpsAvailable);
      const move = validMoves.find(m => m.row === row && m.col === col);

      if (move) {
        const newBoard = board.map(r => r.slice());
        newBoard[row][col] = { ...selectedPiece.piece };
        newBoard[selectedPiece.row][selectedPiece.col] = null;

        if (move.isJump) {
          newBoard[move.captureRow][move.captureCol] = null;
        }

        if ((row === 0 && selectedPiece.piece.player === 'player2') ||
          (row === 7 && selectedPiece.piece.player === 'player1')) {
          newBoard[row][col].isKing = true;
        }

        setBoard(newBoard);

        // Check if more jumps are available from the new position
        if (move.isJump) {
          const moreJumps = getValidMoves(row, col, newBoard[row][col], newBoard, true);
          if (moreJumps.length > 0) {
            // Keep the piece selected for another jump
            setSelectedPiece({ row, col, piece: newBoard[row][col] });
            return; // Don't end turn yet
          }
        }

        setSelectedPiece(null);

        const gameWinner = checkWinner(newBoard);
        const nextTurn = currentTurn === 'player1' ? 'player2' : 'player1';

        // Update turn locally immediately
        setCurrentTurn(nextTurn);
        if (gameWinner) {
          setWinner(gameWinner);
        }

        await updateGameState(
          gameId,
          { board: newBoard },
          nextTurn,
          gameWinner,
          userId
        );

        if (onTurnComplete) {
          await onTurnComplete();
        }
      } else {
        setSelectedPiece(null);
      }
    } else if (board[row][col] && board[row][col].player === myPlayer) {
      setSelectedPiece({ row, col, piece: board[row][col] });
    }
  }

  function checkWinner(board) {
    let player1Pieces = 0;
    let player2Pieces = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col]) {
          if (board[row][col].player === 'player1') player1Pieces++;
          else player2Pieces++;
        }
      }
    }

    if (player1Pieces === 0) return 'player2';
    if (player2Pieces === 0) return 'player1';
    return null;
  }

  async function restartGame() {
    if (gameId) {
      await endGame(gameId);
    }

    // Reset local state
    setGameId(null);
    setBoard(initCheckersBoard());
    setSelectedPiece(null);
    setCurrentTurn('player1');
    setWinner(null);
    setLoading(true);

    // Create a new game
    const newGame = await createGame(couple.id, 'checkers', { board: initCheckersBoard() }, userId);
    if (newGame) {
      setGameId(newGame.id);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameModalContent}>
          <Text style={styles.gameModalTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  const isMyTurn = currentTurn === myPlayer;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Checkers</Text>

        <Text style={styles.playerInfoText}>
          You are: {myPlayer === 'player1' ? 'Red ⭕' : 'Black ⚫'} | Partner: {partnerName}
        </Text>

        <Text style={[styles.turnText, isMyTurn && styles.myTurnText]}>
          {winner
            ? `${winner === myPlayer ? 'You Win!' : partnerName + ' Wins!'}`
            : isMyTurn
              ? "Your Turn!"
              : `${partnerName}'s Turn`}
        </Text>

        <View style={styles.checkersBoard}>
          {board.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.checkersRow}>
              {row.map((cell, colIndex) => {
                const isLight = (rowIndex + colIndex) % 2 === 0;
                const isSelected = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
                const validMove = selectedPiece ?
                  getValidMoves(selectedPiece.row, selectedPiece.col, selectedPiece.piece)
                    .find(m => m.row === rowIndex && m.col === colIndex) : null;

                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[
                      styles.checkersSquare,
                      { backgroundColor: isLight ? '#F5DEB3' : '#8B4513' },
                      isSelected && { backgroundColor: '#90EE90' },
                      validMove && { backgroundColor: '#FFD700' }
                    ]}
                    onPress={() => handleSquarePress(rowIndex, colIndex)}
                    activeOpacity={!isMyTurn || winner ? 1 : 0.7}
                  >
                    {cell && (
                      <View style={[
                        styles.checkersPiece,
                        { backgroundColor: cell.player === 'player1' ? '#DC143C' : '#000000' }
                      ]}>
                        {cell.isKing && <Text style={styles.checkersKing}>👑</Text>}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.gameButtons}>
          {winner && (
            <TouchableOpacity
              style={[styles.gameButton, styles.completeButton]}
              onPress={() => onComplete(winner === myPlayer)}
            >
              <Text style={styles.gameButtonText}>Complete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.gameButton, { backgroundColor: '#FF9500' }]}
            onPress={restartGame}
          >
            <Text style={styles.gameButtonText}>Restart Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gameButton, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={styles.gameButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function MemoryMatchGame({ couple, userId, onClose, onTurnComplete, onComplete }) {
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [currentTurn, setCurrentTurn] = useState('player1');
  const [myPlayer, setMyPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState(null);
  const [partnerName, setPartnerName] = useState('Partner');

  const emojis = ['🎮', '🎯', '🎨', '🎭', '🎪', '🎬', '🎵', '🎸'];

  function initMemoryCards() {
    const pairs = emojis.flatMap(emoji => [emoji, emoji]);
    return pairs.sort(() => Math.random() - 0.5);
  }

  useEffect(() => {
    async function loadGame() {
      const player = couple.auth_user1_id === userId ? 'player1' : 'player2';
      setMyPlayer(player);

      const partner = couple.auth_user1_id === userId ? couple.auth_user2_id : couple.auth_user1_id;
      setPartnerName(partner ? 'Partner' : 'Partner');

      const existingGame = await getActiveGame(couple.id, 'memorymatch');
      if (existingGame) {
        setGameId(existingGame.id);
        setCards(existingGame.game_state.cards);
        setMatchedPairs(existingGame.game_state.matchedPairs || []);
        setScores(existingGame.game_state.scores || { player1: 0, player2: 0 });
        setCurrentTurn(existingGame.current_turn);
        setTimeout(() => setWinner(existingGame.winner), 100);
      } else {
        const initialCards = initMemoryCards();
        const newGame = await createGame(couple.id, 'memorymatch', {
          cards: initialCards,
          matchedPairs: [],
          scores: { player1: 0, player2: 0 }
        }, userId);

        if (newGame) {
          setGameId(newGame.id);
          setCards(initialCards);
        }
      }
      setLoading(false);
    }
    loadGame();
  }, []);

  // Subscribe to real-time game updates
  useEffect(() => {
    if (!gameId) return;

    const subscription = supabase
      .channel(`game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('🎮 Memory Match game update received:', payload.new);
          const updated = payload.new;
          setCards(updated.game_state.cards);
          setMatchedPairs(updated.game_state.matchedPairs || []);
          setScores(updated.game_state.scores || { player1: 0, player2: 0 });
          setCurrentTurn(updated.current_turn);
          setFlippedIndices([]); // Clear flipped cards on any update
          if (updated.winner) {
            setWinner(updated.winner);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [gameId]);

  async function handleCardPress(index) {
    if (currentTurn !== myPlayer || winner) return;
    if (flippedIndices.includes(index) || matchedPairs.includes(index)) return;
    if (flippedIndices.length >= 2) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      const isMatch = cards[first] === cards[second];

      setTimeout(async () => {
        if (isMatch) {
          const newMatchedPairs = [...matchedPairs, first, second];
          const newScores = { ...scores };
          newScores[currentTurn]++;

          setMatchedPairs(newMatchedPairs);
          setScores(newScores);
          setFlippedIndices([]);

          const gameWinner = newMatchedPairs.length === cards.length ?
            (newScores.player1 > newScores.player2 ? 'player1' :
              newScores.player2 > newScores.player1 ? 'player2' : 'draw') : null;

          // Traditional rules: keep the same turn when you find a match
          const nextTurn = currentTurn;

          await updateGameState(
            gameId,
            {
              cards,
              matchedPairs: newMatchedPairs,
              scores: newScores
            },
            nextTurn,
            gameWinner,
            userId
          );

          if (gameWinner) {
            setWinner(gameWinner);
          }

          if (onTurnComplete) {
            await onTurnComplete();
          }
        } else {
          setFlippedIndices([]);
          // Only switch turns when no match is found
          const nextTurn = currentTurn === 'player1' ? 'player2' : 'player1';
          setCurrentTurn(nextTurn);

          await updateGameState(
            gameId,
            { cards, matchedPairs, scores },
            nextTurn,
            null,
            userId
          );

          if (onTurnComplete) {
            await onTurnComplete();
          }
        }
      }, 1000);
    }
  }

  if (loading) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.gameModalContent}>
          <Text style={styles.gameModalTitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  const isMyTurn = currentTurn === myPlayer;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Memory Match</Text>

        <Text style={styles.playerInfoText}>
          You: {scores[myPlayer]} | {partnerName}: {scores[myPlayer === 'player1' ? 'player2' : 'player1']}
        </Text>

        <Text style={[styles.turnText, isMyTurn && styles.myTurnText]}>
          {winner
            ? winner === 'draw'
              ? "It's a Draw!"
              : winner === myPlayer
                ? 'You Win!'
                : `${partnerName} Wins!`
            : isMyTurn
              ? "Your Turn!"
              : `${partnerName}'s Turn`}
        </Text>

        <View style={styles.memoryGrid}>
          {cards.map((card, index) => {
            const isFlipped = flippedIndices.includes(index) || matchedPairs.includes(index);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.memoryCard,
                  isFlipped && styles.memoryCardFlipped
                ]}
                onPress={() => handleCardPress(index)}
                activeOpacity={!isMyTurn || winner ? 1 : 0.7}
                disabled={isFlipped || !isMyTurn || winner}
              >
                <Text style={styles.memoryCardText}>
                  {isFlipped ? card : '?'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.gameButtons}>
          {winner && (
            <TouchableOpacity
              style={[styles.gameButton, styles.completeButton]}
              onPress={() => onComplete(winner === 'draw' ? true : winner === myPlayer)}
            >
              <Text style={styles.gameButtonText}>Complete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.gameButton, styles.closeButton]} onPress={onClose}>
            <Text style={styles.gameButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.secondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  backButtonContainer: {
    padding: 15,
    paddingBottom: 0,
  },
  backButton: {
    backgroundColor: theme.card,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  backButtonText: {
    color: theme.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoryCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  categoryEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  categoryDescription: {
    fontSize: 14,
    color: theme.secondary,
    textAlign: 'center',
  },
  gameCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  gameEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  gameName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  gameReward: {
    fontSize: 16,
    color: theme.secondary,
  },
  gameCardPending: {
    borderColor: theme.primary,
    borderWidth: 3,
    shadowColor: theme.primary,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  gameCardContent: {
    alignItems: 'center',
  },
  yourTurnBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  yourTurnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.secondary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gameModalContent: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 500,
    alignItems: 'center',
  },
  gameModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 20,
  },
  playerInfoText: {
    fontSize: 14,
    color: theme.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  turnText: {
    fontSize: 18,
    color: theme.secondary,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  myTurnText: {
    color: theme.primary,
    fontSize: 20,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  cell: {
    width: '33.33%',
    height: '33.33%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    backgroundColor: theme.background,
  },
  cellText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.primary,
  },
  gameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  gameButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  completeButton: {
    backgroundColor: '#32CD32',
  },
  closeButton: {
    backgroundColor: theme.border,
  },
  gameButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  triviaProgress: {
    fontSize: 14,
    color: theme.secondary,
    marginBottom: 20,
  },
  triviaQuestion: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 30,
  },
  triviaOptions: {
    width: '100%',
  },
  triviaOption: {
    backgroundColor: theme.background,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    alignItems: 'center',
  },
  triviaOptionText: {
    fontSize: 18,
    color: theme.primary,
    fontWeight: 'bold',
  },
  triviaResult: {
    alignItems: 'center',
    padding: 20,
  },
  triviaResultText: {
    fontSize: 18,
    color: theme.primary,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  triviaInfo: {
    fontSize: 14,
    color: theme.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
  },
  dotsPlayer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.border,
  },
  dotsPlayerActive: {
    color: theme.primary,
    fontSize: 20,
  },
  dotsWinner: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  dotsGrid: {
    backgroundColor: theme.background,
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.primary,
  },
  horizontalLineContainer: {
    width: 70,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalLine: {
    width: 70,
    height: 5,
    backgroundColor: theme.backgroundSecondary,
  },
  lineActive: {
    backgroundColor: theme.primary,
  },
  verticalRow: {
    flexDirection: 'row',
    height: 70,
    alignItems: 'flex-start',
  },
  verticalContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: 70,
  },
  verticalLineContainer: {
    width: 12,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalLine: {
    width: 5,
    height: 70,
    backgroundColor: theme.backgroundSecondary,
  },
  boxSpace: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxOwner: {
    fontSize: 30,
  },
  whiteboardContainer: {
    flex: 1,
    backgroundColor: theme.background,
    width: '100%',
    height: '100%',
  },
  whiteboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: theme.card,
    borderBottomWidth: 2,
    borderBottomColor: theme.backgroundSecondary,
  },
  whiteboardBackButton: {
    fontSize: 28,
    color: theme.primary,
    fontWeight: 'bold',
  },
  whiteboardTabs: {
    flexDirection: 'row',
    gap: 20,
  },
  whiteboardTab: {
    fontSize: 18,
    color: theme.border,
    fontWeight: 'bold',
    paddingBottom: 5,
  },
  whiteboardTabActive: {
    color: theme.primary,
    borderBottomWidth: 3,
    borderBottomColor: theme.primary,
  },
  whiteboardControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.card,
  },
  whiteboardControlLeft: {
    flexDirection: 'row',
    gap: 10,
  },
  whiteboardControlButton: {
    backgroundColor: theme.background,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.border,
  },
  whiteboardControlText: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: 'bold',
  },
  whiteboardSaveButton: {
    backgroundColor: theme.card,
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  whiteboardSaveText: {
    color: theme.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  whiteboardCanvas: {
    width: '100%',
    aspectRatio: 1, // Square canvas - consistent size
    backgroundColor: theme.card,
    margin: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    overflow: 'hidden',
  },
  whiteboardToolBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.backgroundSecondary,
    gap: 10,
  },
  whiteboardToolButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  whiteboardToolButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  whiteboardToolText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.primary,
  },
  whiteboardColorPicker: {
    backgroundColor: theme.card,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: theme.backgroundSecondary,
  },
  whiteboardColorPickerLabel: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  whiteboardColorScroll: {
    paddingHorizontal: 15,
    gap: 12,
  },
  whiteboardColorButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  whiteboardColorButtonActive: {
    borderWidth: 4,
    borderColor: '#000',
  },
  whiteboardBackgroundPicker: {
    backgroundColor: theme.card,
    paddingTop: 12,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: theme.backgroundSecondary,
  },
  whiteboardBackgroundLabel: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  whiteboardBackgroundScroll: {
    paddingHorizontal: 15,
    gap: 10,
  },
  whiteboardBackgroundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  whiteboardBackgroundButtonActive: {
    borderWidth: 3,
    borderColor: theme.primary,
  },
  whiteboardGallery: {
    flex: 1,
  },
  whiteboardGalleryContent: {
    padding: 15,
  },
  whiteboardGalleryItem: {
    backgroundColor: theme.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  whiteboardGalleryCanvas: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.card,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  whiteboardGalleryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whiteboardGalleryDate: {
    fontSize: 12,
    color: theme.secondary,
  },
  whiteboardDeleteButton: {
    backgroundColor: theme.primary,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  whiteboardDeleteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  whiteboardWidgetButton: {
    backgroundColor: theme.border,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  whiteboardWidgetButtonActive: {
    backgroundColor: theme.secondary,
  },
  whiteboardWidgetText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  customSliderContainer: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  customSliderTrack: {
    position: 'relative',
    height: 6,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 3,
  },
  customSliderFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 3,
  },
  customSliderThumb: {
    position: 'absolute',
    top: -9,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  customAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAlertContainer: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 25,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.primary,
  },
  customAlertTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  customAlertMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  customAlertButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  customAlertButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  colorSelectorButton: {
  },
  colorSelectorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelectorBorder: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.border,
  },
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  colorPickerContainer: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: theme.backgroundSecondary,
  },
  colorPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  colorPickerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
  },
  colorPickerClose: {
    fontSize: 28,
    color: theme.primary,
    fontWeight: 'bold',
  },
  colorPickerSection: {
    marginBottom: 25,
  },
  colorPickerSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 12,
  },
  colorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorPickerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  colorPickerCircleActive: {
    borderWidth: 4,
    borderColor: '#000',
  },
  colorPickerDoneButton: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  colorPickerDoneText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brushSizeButton: {
  },
  brushSizeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  brushSizePreview: {
    backgroundColor: theme.primary,
  },
  brushSizePickerSection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  brushSizePreviewLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  brushSizeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 20,
  },
  brushSizeSlider: {
    width: '100%',
    height: 40,
  },
  connectFourBoard: {
    backgroundColor: '#0066CC',
    padding: 10,
    borderRadius: 15,
    marginBottom: 20,
  },
  connectFourRow: {
    flexDirection: 'row',
  },
  connectFourCell: {
    width: 45,
    height: 45,
    margin: 3,
    backgroundColor: theme.card,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectFourPiece: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  connectFourWinningCell: {
    borderWidth: 3,
    borderColor: '#32CD32',
  },
  reversiScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  reversiContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  reversiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
  },
  reversiPlayerScore: {
    backgroundColor: theme.background,
    padding: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  reversiScoreLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  reversiScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
  },
  reversiBoard: {
    backgroundColor: '#228B22',
    padding: 5,
    borderRadius: 15,
    marginBottom: 20,
    alignSelf: 'center',
  },
  reversiRow: {
    flexDirection: 'row',
  },
  reversiCell: {
    width: 36,
    height: 36,
    margin: 1.5,
    backgroundColor: '#2E8B57',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a6b3a',
  },
  reversiPiece: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  reversiValidCell: {
    backgroundColor: '#3CB371',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  reversiHint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
    opacity: 0.6,
  },
  drawingViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  drawingViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: theme.card,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.primary,
  },
  drawingViewerCloseText: {
    fontSize: 24,
    color: theme.primary,
    fontWeight: 'bold',
  },
  drawingViewerCanvas: {
    width: '90%',
    aspectRatio: 1,
    backgroundColor: theme.card,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: theme.backgroundSecondary,
    overflow: 'hidden',
  },
  wouldYouRatherPrompt: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  wouldYouRatherOption: {
    backgroundColor: theme.background,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  wouldYouRatherLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.secondary,
    marginBottom: 8,
  },
  wouldYouRatherOr: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginVertical: 10,
  },
  whosMoreLikelyQuestion: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 28,
  },
  whosMoreLikelyOption: {
    backgroundColor: theme.background,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    alignItems: 'center',
  },
  whosMoreLikelyText: {
    fontSize: 18,
    color: theme.primary,
    fontWeight: 'bold',
  },
  currentPlayerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.secondary,
    textAlign: 'center',
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.background,
    borderRadius: 20,
    alignSelf: 'center',
  },
  resultsFullContainer: {
    flex: 1,
  },
  resultsSafeArea: {
    flex: 1,
  },
  resultsHeaderNew: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 25,
    alignItems: 'center',
  },
  resultsTitleNew: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  resultsStatsBox: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  resultsStatsNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  resultsStatsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.secondary,
    marginBottom: 5,
  },
  resultsStatsDetail: {
    fontSize: 14,
    color: '#999',
  },
  resultsScrollNew: {
    flex: 1,
  },
  resultsScrollContentNew: {
    padding: 15,
    paddingBottom: 30,
  },
  resultCardNew: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultCardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    backgroundColor: theme.background,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  resultMatchBadge: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#32CD32',
    backgroundColor: '#F0FFF0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  resultQuestionNew: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 15,
    lineHeight: 22,
  },
  resultAnswersNew: {
    gap: 10,
  },
  resultAnswerBox: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  resultAnswerBoxMatch: {
    borderColor: '#32CD32',
    backgroundColor: '#F0FFF0',
  },
  resultAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultAvatarP1: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  resultAvatarP2: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  resultAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultAnswerChoice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.primary,
  },
  resultAnswerTextNew: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  resultsButtonsNew: {
    marginTop: 20,
    gap: 10,
  },
  resultsCompleteBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  resultsCompleteBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsCloseBtn: {
    backgroundColor: theme.card,
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  resultsCloseBtnText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Checkers styles
  checkersBoard: {
    width: 320,
    height: 320,
    marginVertical: 15,
  },
  checkersRow: {
    flexDirection: 'row',
  },
  checkersSquare: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkersPiece: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  checkersKing: {
    fontSize: 16,
  },
  // Memory Match styles
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 15,
    gap: 8,
  },
  memoryCard: {
    width: 70,
    height: 70,
    backgroundColor: theme.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  memoryCardFlipped: {
    backgroundColor: theme.card,
  },
  memoryCardText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
});
