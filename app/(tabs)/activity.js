import { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getPetData, savePetData, getCurrency, saveCurrency, getStreakData, saveStreakData } from '../../lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateGalleryWidget } from '../../lib/widgetHelper';
import { SkiaDrawingCanvas } from '../components/SkiaDrawingCanvas';
import { File, Paths } from 'expo-file-system';

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
  const [couple, setCouple] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showTicTacToe, setShowTicTacToe] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showDotsAndBoxes, setShowDotsAndBoxes] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showConnectFour, setShowConnectFour] = useState(false);
  const [showReversi, setShowReversi] = useState(false);
  const [showWouldYouRather, setShowWouldYouRather] = useState(false);
  const [showWhosMoreLikely, setShowWhosMoreLikely] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    loadCoupleData();
  }, []);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  async function loadCoupleData() {
    // Get device user ID from AsyncStorage
    const deviceUserId = await import('../../lib/storage').then(m => m.getDeviceUserId());
    setUserId(deviceUserId);

    if (isSupabaseConfigured()) {
      try {
        const { data: coupleData, error } = await supabase
          .from('couples')
          .select('*')
          .or(`user1_id.eq.${deviceUserId},user2_id.eq.${deviceUserId}`)
          .single();

        if (error) {
          console.log('Supabase query error (using local mode):', error.message);
          // Fallback to local mode
          const localCouple = await import('../../lib/storage').then(m => m.getCoupleData());
          if (localCouple) {
            setCouple(localCouple);
          }
        } else if (coupleData) {
          setCouple(coupleData);
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
  }

  async function addHappiness(amount, activity) {
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

    // Award coins for playing games
    const currency = await getCurrency();
    const newCurrency = currency + 5;
    await saveCurrency(newCurrency);

    // Update streak
    await updateStreak();

    showAlert('Success!', `Your pet gained ${amount} happiness from ${activity}! 🎉\n+5 coins earned!`);
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
      <LinearGradient colors={['#FFE5EC', '#FFF0F5']} style={styles.container}>
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
    <LinearGradient colors={['#FFE5EC', '#FFF0F5']} style={styles.container}>
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
              style={styles.gameCard}
              onPress={() => setShowTicTacToe(true)}
            >
              <Text style={styles.gameEmoji}>❌⭕</Text>
              <Text style={styles.gameName}>Tic Tac Toe</Text>
              <Text style={styles.gameReward}>+5 Happiness</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setShowDotsAndBoxes(true)}
            >
              <Text style={styles.gameEmoji}>⬛🟦</Text>
              <Text style={styles.gameName}>Dots and Boxes</Text>
              <Text style={styles.gameReward}>+5 Happiness</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setShowConnectFour(true)}
            >
              <Text style={styles.gameEmoji}>🔴🟡</Text>
              <Text style={styles.gameName}>Connect Four</Text>
              <Text style={styles.gameReward}>+5 Happiness</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setShowReversi(true)}
            >
              <Text style={styles.gameEmoji}>⚫⚪</Text>
              <Text style={styles.gameName}>Reversi</Text>
              <Text style={styles.gameReward}>+5 Happiness</Text>
            </TouchableOpacity>
          </>
        )}

        {selectedCategory === 'conversation' && (
          <>
            <Text style={styles.title}>Conversation</Text>

            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => setShowTrivia(true)}
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

        {selectedCategory === 'other' && (
          <>
            <Text style={styles.title}>Other Activities</Text>

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
      </ScrollView>

      {/* Tic Tac Toe Modal */}
      <Modal visible={showTicTacToe} animationType="slide" transparent>
        <TicTacToeGame
          onClose={() => setShowTicTacToe(false)}
          onComplete={() => {
            setShowTicTacToe(false);
            addHappiness(5, 'playing Tic Tac Toe');
          }}
        />
      </Modal>

      {/* Trivia Modal */}
      <Modal visible={showTrivia} animationType="slide" transparent>
        <TriviaGame
          onClose={() => setShowTrivia(false)}
          onComplete={() => {
            setShowTrivia(false);
            addHappiness(5, 'playing Couple Trivia');
          }}
        />
      </Modal>

      {/* Dots and Boxes Modal */}
      <Modal visible={showDotsAndBoxes} animationType="slide" transparent>
        <DotsAndBoxesGame
          onClose={() => setShowDotsAndBoxes(false)}
          onComplete={() => {
            setShowDotsAndBoxes(false);
            addHappiness(5, 'playing Dots and Boxes');
          }}
        />
      </Modal>

      {/* Whiteboard Modal */}
      <Modal visible={showWhiteboard} animationType="slide">
        <WhiteboardGame
          onClose={() => setShowWhiteboard(false)}
          onComplete={() => {
            setShowWhiteboard(false);
            addHappiness(3, 'using the Whiteboard');
          }}
        />
      </Modal>

      {/* Connect Four Modal */}
      <Modal visible={showConnectFour} animationType="slide" transparent>
        <ConnectFourGame
          onClose={() => setShowConnectFour(false)}
          onComplete={() => {
            setShowConnectFour(false);
            addHappiness(5, 'playing Connect Four');
          }}
        />
      </Modal>

      {/* Reversi Modal */}
      <Modal visible={showReversi} animationType="slide" transparent>
        <ReversiGame
          onClose={() => setShowReversi(false)}
          onComplete={() => {
            setShowReversi(false);
            addHappiness(5, 'playing Reversi');
          }}
        />
      </Modal>

      {/* Would You Rather Modal */}
      <Modal visible={showWouldYouRather} animationType="slide" transparent>
        <WouldYouRatherGame
          onClose={() => setShowWouldYouRather(false)}
          onComplete={() => {
            setShowWouldYouRather(false);
            addHappiness(5, 'playing Would You Rather');
          }}
        />
      </Modal>

      {/* Who's More Likely Modal */}
      <Modal visible={showWhosMoreLikely} animationType="slide" transparent>
        <WhosMoreLikelyGame
          onClose={() => setShowWhosMoreLikely(false)}
          onComplete={() => {
            setShowWhosMoreLikely(false);
            addHappiness(5, "playing Who's More Likely To");
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

function TicTacToeGame({ onClose, onComplete }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);

  function handlePress(index) {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);

    const gameWinner = calculateWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
    }
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

  function reset() {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
  }

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Tic Tac Toe</Text>

        <Text style={styles.turnText}>
          {winner
            ? winner === 'Draw'
              ? "It's a Draw!"
              : `${winner} Wins!`
            : `${isXNext ? 'X' : 'O'}'s Turn`}
        </Text>

        <View style={styles.board}>
          {board.map((cell, index) => (
            <TouchableOpacity
              key={index}
              style={styles.cell}
              onPress={() => handlePress(index)}
            >
              <Text style={styles.cellText}>{cell}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.gameButtons}>
          <TouchableOpacity style={styles.gameButton} onPress={reset}>
            <Text style={styles.gameButtonText}>Reset</Text>
          </TouchableOpacity>

          {winner && (
            <TouchableOpacity
              style={[styles.gameButton, styles.completeButton]}
              onPress={onComplete}
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
    </View>
  );
}

function TriviaGame({ onClose, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const questions = [
    {
      question: "What's your partner's favorite color?",
      options: ['Red', 'Blue', 'Green', 'Yellow'],
      info: 'Remember their answer!',
    },
    {
      question: "What's your partner's dream vacation destination?",
      options: ['Beach', 'Mountains', 'City', 'Countryside'],
      info: 'Plan your next trip together!',
    },
    {
      question: "What's your partner's favorite food?",
      options: ['Pizza', 'Sushi', 'Pasta', 'Burgers'],
      info: "Date night idea!",
    },
    {
      question: "What's your partner's love language?",
      options: ['Words', 'Touch', 'Gifts', 'Time'],
      info: 'Express love their way!',
    },
    {
      question: "What's your partner's favorite movie genre?",
      options: ['Romance', 'Action', 'Comedy', 'Horror'],
      info: 'Movie night sorted!',
    },
  ];

  function handleAnswer(answer) {
    setSelectedAnswer(answer);
    setShowResult(true);
    setScore(score + 1);
  }

  function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      onComplete();
    }
  }

  const question = questions[currentQuestion];

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Couple Trivia</Text>
        <Text style={styles.triviaProgress}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>

        <Text style={styles.triviaQuestion}>{question.question}</Text>

        {!showResult ? (
          <View style={styles.triviaOptions}>
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.triviaOption}
                onPress={() => handleAnswer(option)}
              >
                <Text style={styles.triviaOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.triviaResult}>
            <Text style={styles.triviaResultText}>You selected: {selectedAnswer}</Text>
            <Text style={styles.triviaInfo}>{question.info}</Text>
            <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
              <Text style={styles.nextButtonText}>
                {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.gameButton, styles.closeButton, { marginTop: 20 }]}
          onPress={onClose}
        >
          <Text style={styles.gameButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DotsAndBoxesGame({ onClose, onComplete }) {
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
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 or 2
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [gameOver, setGameOver] = useState(false);

  function handleHorizontalLine(row, col) {
    if (horizontalLines[row][col] || gameOver) return;

    const newHorizontal = horizontalLines.map(r => [...r]);
    newHorizontal[row][col] = true;
    setHorizontalLines(newHorizontal);

    const boxesCompleted = checkBoxesCompleted(newHorizontal, verticalLines, row, col, 'horizontal');

    if (boxesCompleted === 0) {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  }

  function handleVerticalLine(row, col) {
    if (verticalLines[row][col] || gameOver) return;

    const newVertical = verticalLines.map(r => [...r]);
    newVertical[row][col] = true;
    setVerticalLines(newVertical);

    const boxesCompleted = checkBoxesCompleted(horizontalLines, newVertical, row, col, 'vertical');

    if (boxesCompleted === 0) {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  }

  function checkBoxesCompleted(hLines, vLines, row, col, type) {
    const newBoxes = boxes.map(r => [...r]);
    let completed = 0;

    if (type === 'horizontal') {
      // Check box above
      if (row > 0) {
        const boxRow = row - 1;
        const boxCol = col;
        if (!boxes[boxRow][boxCol] && isBoxComplete(hLines, vLines, boxRow, boxCol)) {
          newBoxes[boxRow][boxCol] = currentPlayer;
          completed++;
        }
      }
      // Check box below
      if (row < gridSize - 1) {
        const boxRow = row;
        const boxCol = col;
        if (!boxes[boxRow][boxCol] && isBoxComplete(hLines, vLines, boxRow, boxCol)) {
          newBoxes[boxRow][boxCol] = currentPlayer;
          completed++;
        }
      }
    } else {
      // Check box left
      if (col > 0) {
        const boxRow = row;
        const boxCol = col - 1;
        if (!boxes[boxRow][boxCol] && isBoxComplete(hLines, vLines, boxRow, boxCol)) {
          newBoxes[boxRow][boxCol] = currentPlayer;
          completed++;
        }
      }
      // Check box right
      if (col < gridSize - 1) {
        const boxRow = row;
        const boxCol = col;
        if (!boxes[boxRow][boxCol] && isBoxComplete(hLines, vLines, boxRow, boxCol)) {
          newBoxes[boxRow][boxCol] = currentPlayer;
          completed++;
        }
      }
    }

    if (completed > 0) {
      setBoxes(newBoxes);
      const newScores = { ...scores };
      newScores[`player${currentPlayer}`] += completed;
      setScores(newScores);

      // Check if game is over
      const totalBoxes = (gridSize - 1) * (gridSize - 1);
      if (newScores.player1 + newScores.player2 === totalBoxes) {
        setGameOver(true);
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

  function reset() {
    setHorizontalLines(Array(gridSize).fill(null).map(() => Array(gridSize - 1).fill(false)));
    setVerticalLines(Array(gridSize - 1).fill(null).map(() => Array(gridSize).fill(false)));
    setBoxes(Array(gridSize - 1).fill(null).map(() => Array(gridSize - 1).fill(null)));
    setCurrentPlayer(1);
    setScores({ player1: 0, player2: 0 });
    setGameOver(false);
  }

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Dots and Boxes</Text>

        <View style={styles.dotsHeader}>
          <Text style={[styles.dotsPlayer, currentPlayer === 1 && styles.dotsPlayerActive]}>
            🟦 P1: {scores.player1}
          </Text>
          <Text style={[styles.dotsPlayer, currentPlayer === 2 && styles.dotsPlayerActive]}>
            🟥 P2: {scores.player2}
          </Text>
        </View>

        {gameOver && (
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
              onPress={onComplete}
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
    </View>
  );
}

function ConnectFourGame({ onClose, onComplete }) {
  const ROWS = 6;
  const COLS = 7;
  const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 = Red, 2 = Yellow
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState([]);

  function dropPiece(col) {
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

    // Place the piece
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    // Check for winner
    const winResult = checkWinner(newBoard, row, col, currentPlayer);
    if (winResult) {
      setWinner(currentPlayer);
      setWinningCells(winResult);
    } else if (isBoardFull(newBoard)) {
      setWinner('draw');
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
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

  function reset() {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPlayer(1);
    setWinner(null);
    setWinningCells([]);
  }

  function isWinningCell(row, col) {
    return winningCells.some(([r, c]) => r === row && c === col);
  }

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Connect Four</Text>

        <Text style={styles.turnText}>
          {winner
            ? winner === 'draw'
              ? "It's a Draw!"
              : `${winner === 1 ? '🔴 Red' : '🟡 Yellow'} Wins!`
            : `${currentPlayer === 1 ? '🔴 Red' : '🟡 Yellow'}'s Turn`}
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
                >
                  {cell && (
                    <View style={[
                      styles.connectFourPiece,
                      { backgroundColor: cell === 1 ? '#FF1493' : '#FFD700' }
                    ]} />
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

          {winner && (
            <TouchableOpacity
              style={[styles.gameButton, styles.completeButton]}
              onPress={onComplete}
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
    </View>
  );
}

function ReversiGame({ onClose, onComplete }) {
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
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 = Black, 2 = White
  const [validMoves, setValidMoves] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [scores, setScores] = useState({ black: 2, white: 2 });

  useEffect(() => {
    const moves = getValidMoves(board, currentPlayer);
    setValidMoves(moves);

    if (moves.length === 0) {
      // Current player has no moves, check if opponent has moves
      const opponentMoves = getValidMoves(board, currentPlayer === 1 ? 2 : 1);
      if (opponentMoves.length === 0) {
        // Game over
        setGameOver(true);
      } else {
        // Pass turn
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      }
    }
  }, [board, currentPlayer]);

  useEffect(() => {
    calculateScores();
  }, [board]);

  function getValidMoves(board, player) {
    const moves = [];
    const opponent = player === 1 ? 2 : 1;
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
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
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
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

  function placePiece(row, col) {
    if (gameOver) return;
    if (!validMoves.some(([r, c]) => r === row && c === col)) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;

    const toFlip = getPiecesToFlip(board, row, col, currentPlayer);
    toFlip.forEach(([r, c]) => {
      newBoard[r][c] = currentPlayer;
    });

    setBoard(newBoard);
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
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

  function reset() {
    setBoard(initBoard());
    setCurrentPlayer(1);
    setGameOver(false);
    setScores({ black: 2, white: 2 });
  }

  function isValidMove(row, col) {
    return validMoves.some(([r, c]) => r === row && c === col);
  }

  return (
    <View style={styles.modalContainer}>
      <ScrollView contentContainerStyle={styles.reversiScrollContent}>
        <View style={styles.reversiContent}>
          <Text style={styles.gameModalTitle}>Reversi</Text>

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
            <Text style={styles.turnText}>
              {currentPlayer === 1 ? '⚫ Black' : '⚪ White'}'s Turn
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
                onPress={onComplete}
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
    </View>
  );
}

function WouldYouRatherGame({ onClose, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 or 2
  const [partner1Answers, setPartner1Answers] = useState([]);
  const [partner2Answers, setPartner2Answers] = useState([]);
  const [showingResult, setShowingResult] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);

  const questions = [
    {
      optionA: 'Always know what your partner is thinking',
      optionB: 'Always know where your partner is',
    },
    {
      optionA: 'Go on a romantic beach vacation',
      optionB: 'Go on an adventurous mountain trip',
    },
    {
      optionA: 'Have a fancy dinner date every week',
      optionB: 'Have a cozy movie night at home every week',
    },
    {
      optionA: 'Relive your first date',
      optionB: 'Get a preview of your future together',
    },
    {
      optionA: 'Have breakfast in bed together',
      optionB: 'Watch the sunset together',
    },
    {
      optionA: 'Be able to cook any meal perfectly',
      optionB: 'Be able to dance any dance perfectly',
    },
    {
      optionA: 'Have matching tattoos',
      optionB: 'Have matching outfits',
    },
    {
      optionA: 'Go to a concert together',
      optionB: 'Go to a sports game together',
    },
  ];

  function handleAnswer(answer) {
    if (currentPlayer === 1) {
      setPartner1Answers([...partner1Answers, answer]);
      setShowingResult(true);
    } else {
      setPartner2Answers([...partner2Answers, answer]);
      setShowingResult(true);
    }
  }

  function nextStep() {
    if (currentPlayer === 1) {
      // Partner 1 answered, now Partner 2's turn
      setCurrentPlayer(2);
      setShowingResult(false);
    } else {
      // Both answered, move to next question or show results
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setCurrentPlayer(1);
        setShowingResult(false);
      } else {
        setShowFinalResults(true);
      }
    }
  }

  const question = questions[currentQuestion];

  if (showFinalResults) {
    const matchCount = partner1Answers.filter((ans, idx) => ans === partner2Answers[idx]).length;
    const matchPercentage = Math.round((matchCount / questions.length) * 100);

    return (
      <LinearGradient colors={['#FFE5EC', '#FFF0F5']} style={styles.resultsFullContainer}>
        <SafeAreaView style={styles.resultsSafeArea}>
          <View style={styles.resultsHeaderNew}>
            <Text style={styles.resultsTitleNew}>Your Results 💕</Text>
            <View style={styles.resultsStatsBox}>
              <Text style={styles.resultsStatsNumber}>{matchPercentage}%</Text>
              <Text style={styles.resultsStatsLabel}>Agreement</Text>
              <Text style={styles.resultsStatsDetail}>
                {matchCount} out of {questions.length} matches
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.resultsScrollNew}
            contentContainerStyle={styles.resultsScrollContentNew}
            showsVerticalScrollIndicator={false}
          >
            {questions.map((q, index) => {
              const isMatch = partner1Answers[index] === partner2Answers[index];
              return (
                <View key={index} style={styles.resultCardNew}>
                  <View style={styles.resultCardHeader}>
                    <Text style={styles.resultCardNumber}>Q{index + 1}</Text>
                    {isMatch && <Text style={styles.resultMatchBadge}>✨ Match!</Text>}
                  </View>

                  <Text style={styles.resultQuestionNew}>Would you rather...</Text>

                  <View style={styles.resultAnswersNew}>
                    <View style={[styles.resultAnswerBox, isMatch && styles.resultAnswerBoxMatch]}>
                      <View style={styles.resultAnswerHeader}>
                        <View style={styles.resultAvatarP1}>
                          <Text style={styles.resultAvatarText}>P1</Text>
                        </View>
                        <Text style={styles.resultAnswerChoice}>Option {partner1Answers[index]}</Text>
                      </View>
                      <Text style={styles.resultAnswerTextNew}>
                        {partner1Answers[index] === 'A' ? q.optionA : q.optionB}
                      </Text>
                    </View>

                    <View style={[styles.resultAnswerBox, isMatch && styles.resultAnswerBoxMatch]}>
                      <View style={styles.resultAnswerHeader}>
                        <View style={styles.resultAvatarP2}>
                          <Text style={styles.resultAvatarText}>P2</Text>
                        </View>
                        <Text style={styles.resultAnswerChoice}>Option {partner2Answers[index]}</Text>
                      </View>
                      <Text style={styles.resultAnswerTextNew}>
                        {partner2Answers[index] === 'A' ? q.optionA : q.optionB}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={styles.resultsButtonsNew}>
              <TouchableOpacity
                style={styles.resultsCompleteBtn}
                onPress={onComplete}
              >
                <Text style={styles.resultsCompleteBtnText}>Complete & Earn Coins</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resultsCloseBtn}
                onPress={onClose}
              >
                <Text style={styles.resultsCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Would You Rather</Text>
        <Text style={styles.triviaProgress}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>

        <Text style={styles.currentPlayerText}>
          {currentPlayer === 1 ? '👤 Partner 1' : '👤 Partner 2'}'s Turn
        </Text>

        <Text style={styles.wouldYouRatherPrompt}>Would you rather...</Text>

        {!showingResult ? (
          <View style={styles.triviaOptions}>
            <TouchableOpacity
              style={styles.wouldYouRatherOption}
              onPress={() => handleAnswer('A')}
            >
              <Text style={styles.wouldYouRatherLabel}>Option A</Text>
              <Text style={styles.triviaOptionText}>{question.optionA}</Text>
            </TouchableOpacity>

            <Text style={styles.wouldYouRatherOr}>OR</Text>

            <TouchableOpacity
              style={styles.wouldYouRatherOption}
              onPress={() => handleAnswer('B')}
            >
              <Text style={styles.wouldYouRatherLabel}>Option B</Text>
              <Text style={styles.triviaOptionText}>{question.optionB}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.triviaResult}>
            <Text style={styles.triviaResultText}>
              {currentPlayer === 1 ? 'Partner 1' : 'Partner 2'} chose: Option{' '}
              {currentPlayer === 1 ? partner1Answers[currentQuestion] : partner2Answers[currentQuestion]}
            </Text>
            <Text style={styles.triviaInfo}>
              {currentPlayer === 1
                ? partner1Answers[currentQuestion] === 'A' ? question.optionA : question.optionB
                : partner2Answers[currentQuestion] === 'A' ? question.optionA : question.optionB}
            </Text>
            <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
              <Text style={styles.nextButtonText}>
                {currentPlayer === 1 ? "Partner 2's Turn" : currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.gameButton, styles.closeButton, { marginTop: 20 }]}
          onPress={onClose}
        >
          <Text style={styles.gameButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WhosMoreLikelyGame({ onClose, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 or 2
  const [partner1Answers, setPartner1Answers] = useState([]);
  const [partner2Answers, setPartner2Answers] = useState([]);
  const [showingResult, setShowingResult] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);

  const questions = [
    "Who's more likely to forget their keys?",
    "Who's more likely to plan a surprise date?",
    "Who's more likely to fall asleep during a movie?",
    "Who's more likely to burn dinner?",
    "Who's more likely to wake up first?",
    "Who's more likely to get lost while driving?",
    "Who's more likely to start a dance party?",
    "Who's more likely to cry during a sad movie?",
    "Who's more likely to check their phone first thing in the morning?",
    "Who's more likely to suggest trying something new?",
  ];

  function handleAnswer(answer) {
    if (currentPlayer === 1) {
      setPartner1Answers([...partner1Answers, answer]);
      setShowingResult(true);
    } else {
      setPartner2Answers([...partner2Answers, answer]);
      setShowingResult(true);
    }
  }

  function nextStep() {
    if (currentPlayer === 1) {
      // Partner 1 answered, now Partner 2's turn
      setCurrentPlayer(2);
      setShowingResult(false);
    } else {
      // Both answered, move to next question or show results
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setCurrentPlayer(1);
        setShowingResult(false);
      } else {
        setShowFinalResults(true);
      }
    }
  }

  if (showFinalResults) {
    const matchCount = partner1Answers.filter((ans, idx) => ans === partner2Answers[idx]).length;
    const matchPercentage = Math.round((matchCount / questions.length) * 100);

    return (
      <LinearGradient colors={['#FFE5EC', '#FFF0F5']} style={styles.resultsFullContainer}>
        <SafeAreaView style={styles.resultsSafeArea}>
          <View style={styles.resultsHeaderNew}>
            <Text style={styles.resultsTitleNew}>Your Results 💕</Text>
            <View style={styles.resultsStatsBox}>
              <Text style={styles.resultsStatsNumber}>{matchPercentage}%</Text>
              <Text style={styles.resultsStatsLabel}>Agreement</Text>
              <Text style={styles.resultsStatsDetail}>
                {matchCount} out of {questions.length} matches
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.resultsScrollNew}
            contentContainerStyle={styles.resultsScrollContentNew}
            showsVerticalScrollIndicator={false}
          >
            {questions.map((q, index) => {
              const isMatch = partner1Answers[index] === partner2Answers[index];
              return (
                <View key={index} style={styles.resultCardNew}>
                  <View style={styles.resultCardHeader}>
                    <Text style={styles.resultCardNumber}>Q{index + 1}</Text>
                    {isMatch && <Text style={styles.resultMatchBadge}>✨ Match!</Text>}
                  </View>

                  <Text style={styles.resultQuestionNew}>{q}</Text>

                  <View style={styles.resultAnswersNew}>
                    <View style={[styles.resultAnswerBox, isMatch && styles.resultAnswerBoxMatch]}>
                      <View style={styles.resultAnswerHeader}>
                        <View style={styles.resultAvatarP1}>
                          <Text style={styles.resultAvatarText}>P1</Text>
                        </View>
                      </View>
                      <Text style={styles.resultAnswerTextNew}>{partner1Answers[index]}</Text>
                    </View>

                    <View style={[styles.resultAnswerBox, isMatch && styles.resultAnswerBoxMatch]}>
                      <View style={styles.resultAnswerHeader}>
                        <View style={styles.resultAvatarP2}>
                          <Text style={styles.resultAvatarText}>P2</Text>
                        </View>
                      </View>
                      <Text style={styles.resultAnswerTextNew}>{partner2Answers[index]}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={styles.resultsButtonsNew}>
              <TouchableOpacity
                style={styles.resultsCompleteBtn}
                onPress={onComplete}
              >
                <Text style={styles.resultsCompleteBtnText}>Complete & Earn Coins</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resultsCloseBtn}
                onPress={onClose}
              >
                <Text style={styles.resultsCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.modalContainer}>
      <View style={styles.gameModalContent}>
        <Text style={styles.gameModalTitle}>Who's More Likely To?</Text>
        <Text style={styles.triviaProgress}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>

        <Text style={styles.currentPlayerText}>
          {currentPlayer === 1 ? '👤 Partner 1' : '👤 Partner 2'}'s Turn
        </Text>

        <Text style={styles.whosMoreLikelyQuestion}>{questions[currentQuestion]}</Text>

        {!showingResult ? (
          <View style={styles.triviaOptions}>
            <TouchableOpacity
              style={styles.whosMoreLikelyOption}
              onPress={() => handleAnswer('Partner 1')}
            >
              <Text style={styles.whosMoreLikelyText}>👤 Partner 1</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whosMoreLikelyOption}
              onPress={() => handleAnswer('Partner 2')}
            >
              <Text style={styles.whosMoreLikelyText}>👤 Partner 2</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whosMoreLikelyOption}
              onPress={() => handleAnswer('Both Equally')}
            >
              <Text style={styles.whosMoreLikelyText}>👫 Both Equally</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.triviaResult}>
            <Text style={styles.triviaResultText}>
              {currentPlayer === 1 ? 'Partner 1' : 'Partner 2'} chose: {currentPlayer === 1 ? partner1Answers[currentQuestion] : partner2Answers[currentQuestion]}
            </Text>
            <Text style={styles.triviaInfo}>
              Great choice! Discuss why you think so.
            </Text>
            <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
              <Text style={styles.nextButtonText}>
                {currentPlayer === 1 ? "Partner 2's Turn" : currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.gameButton, styles.closeButton, { marginTop: 20 }]}
          onPress={onClose}
        >
          <Text style={styles.gameButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WhiteboardGame({ onClose, onComplete }) {
  const [currentTab, setCurrentTab] = useState('canvas');
  const [currentColor, setCurrentColor] = useState('#FF1493');
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
      const drawings = await AsyncStorage.getItem('whiteboard_drawings');
      if (drawings) {
        setSavedDrawings(JSON.parse(drawings));
      }
      const widgetId = await AsyncStorage.getItem('widgetDrawingId');
      if (widgetId) {
        setWidgetDrawingId(widgetId);
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

      // Don't download - just use the base64 data we already have
      // Widgets will use the base64 image data directly from drawing.image
      console.log('Widget will use base64 data, length:', drawing.image?.length);

      await AsyncStorage.setItem('widgetDrawingId', drawingId);
      setWidgetDrawingId(drawingId);

      // Wait a bit for storage to complete before updating widget
      setTimeout(async () => {
        await updateGalleryWidget();
        console.log('Widget update complete');
      }, 500);

      showAlert('Success!', 'Drawing set as widget! The widget should update shortly.');
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

      showAlert('Success!', 'Drawing saved to gallery!');

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
              // Delete from Supabase storage if it exists
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
                    backgroundColor: isEraser ? '#FFE5EC' : currentColor
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
                  backgroundColor: isEraser ? '#FFE5EC' : currentColor
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FF69B4',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButtonContainer: {
    padding: 15,
    paddingBottom: 0,
  },
  backButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  backButtonText: {
    color: '#FF1493',
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE5EC',
    shadowColor: '#FF1493',
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
    color: '#FF1493',
    marginBottom: 5,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#FF69B4',
    textAlign: 'center',
  },
  gameCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE5EC',
    shadowColor: '#FF1493',
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
    color: '#FF1493',
    marginBottom: 5,
  },
  gameReward: {
    fontSize: 16,
    color: '#FF69B4',
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
    color: '#FF1493',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#FF69B4',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gameModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 500,
    alignItems: 'center',
  },
  gameModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 20,
  },
  turnText: {
    fontSize: 18,
    color: '#FF69B4',
    marginBottom: 20,
    fontWeight: 'bold',
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
    borderColor: '#FFE5EC',
    backgroundColor: '#FFF0F5',
  },
  cellText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  gameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  gameButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  completeButton: {
    backgroundColor: '#32CD32',
  },
  closeButton: {
    backgroundColor: '#FFB6D9',
  },
  gameButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  triviaProgress: {
    fontSize: 14,
    color: '#FF69B4',
    marginBottom: 20,
  },
  triviaQuestion: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 30,
  },
  triviaOptions: {
    width: '100%',
  },
  triviaOption: {
    backgroundColor: '#FFF0F5',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFE5EC',
    alignItems: 'center',
  },
  triviaOptionText: {
    fontSize: 18,
    color: '#FF1493',
    fontWeight: 'bold',
  },
  triviaResult: {
    alignItems: 'center',
    padding: 20,
  },
  triviaResultText: {
    fontSize: 18,
    color: '#FF1493',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  triviaInfo: {
    fontSize: 14,
    color: '#FF69B4',
    textAlign: 'center',
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: '#FF1493',
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
    color: '#FFB6D9',
  },
  dotsPlayerActive: {
    color: '#FF1493',
    fontSize: 20,
  },
  dotsWinner: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 15,
    textAlign: 'center',
  },
  dotsGrid: {
    backgroundColor: '#FFF0F5',
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
    backgroundColor: '#FF1493',
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
    backgroundColor: '#FFE5EC',
  },
  lineActive: {
    backgroundColor: '#FF1493',
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
    backgroundColor: '#FFE5EC',
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
    backgroundColor: '#FFF0F5',
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
    backgroundColor: 'white',
    borderBottomWidth: 2,
    borderBottomColor: '#FFE5EC',
  },
  whiteboardBackButton: {
    fontSize: 28,
    color: '#FF1493',
    fontWeight: 'bold',
  },
  whiteboardTabs: {
    flexDirection: 'row',
    gap: 20,
  },
  whiteboardTab: {
    fontSize: 18,
    color: '#FFB6D9',
    fontWeight: 'bold',
    paddingBottom: 5,
  },
  whiteboardTabActive: {
    color: '#FF1493',
    borderBottomWidth: 3,
    borderBottomColor: '#FF1493',
  },
  whiteboardControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
  },
  whiteboardControlLeft: {
    flexDirection: 'row',
    gap: 10,
  },
  whiteboardControlButton: {
    backgroundColor: '#FFF0F5',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFB6D9',
  },
  whiteboardControlText: {
    fontSize: 14,
    color: '#FF1493',
    fontWeight: 'bold',
  },
  whiteboardSaveButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF1493',
  },
  whiteboardSaveText: {
    color: '#FF1493',
    fontWeight: 'bold',
    fontSize: 16,
  },
  whiteboardCanvas: {
    width: '100%',
    aspectRatio: 1, // Square canvas - consistent size
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFE5EC',
    overflow: 'hidden',
  },
  whiteboardToolBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#FFE5EC',
    gap: 10,
  },
  whiteboardToolButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    backgroundColor: '#FFF0F5',
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  whiteboardToolButtonActive: {
    backgroundColor: '#FF1493',
    borderColor: '#FF1493',
  },
  whiteboardToolText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  whiteboardColorPicker: {
    backgroundColor: 'white',
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFE5EC',
  },
  whiteboardColorPickerLabel: {
    fontSize: 13,
    color: '#FF1493',
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
    backgroundColor: 'white',
    paddingTop: 12,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: '#FFE5EC',
  },
  whiteboardBackgroundLabel: {
    fontSize: 13,
    color: '#FF1493',
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
    borderColor: '#FF1493',
  },
  whiteboardGallery: {
    flex: 1,
  },
  whiteboardGalleryContent: {
    padding: 15,
  },
  whiteboardGalleryItem: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  whiteboardGalleryCanvas: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'white',
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
    color: '#FF69B4',
  },
  whiteboardDeleteButton: {
    backgroundColor: '#FF1493',
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
    backgroundColor: '#FFB6D9',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  whiteboardWidgetButtonActive: {
    backgroundColor: '#FF69B4',
  },
  whiteboardWidgetText: {
    color: '#FF1493',
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
    backgroundColor: '#FFE5EC',
    borderRadius: 3,
  },
  customSliderFill: {
    height: '100%',
    backgroundColor: '#FF1493',
    borderRadius: 3,
  },
  customSliderThumb: {
    position: 'absolute',
    top: -9,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF1493',
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
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF1493',
  },
  customAlertTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF1493',
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
    backgroundColor: '#FF1493',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: '#FF1493',
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
    borderColor: '#FFB6D9',
  },
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  colorPickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFE5EC',
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
    color: '#FF1493',
  },
  colorPickerClose: {
    fontSize: 28,
    color: '#FF1493',
    fontWeight: 'bold',
  },
  colorPickerSection: {
    marginBottom: 25,
  },
  colorPickerSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
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
    backgroundColor: '#FF1493',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF1493',
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
    backgroundColor: '#FFF0F5',
    borderWidth: 2,
    borderColor: '#FFE5EC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  brushSizePreview: {
    backgroundColor: '#FF1493',
  },
  brushSizePickerSection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  brushSizePreviewLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F5',
    borderWidth: 2,
    borderColor: '#FFE5EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  brushSizeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
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
    backgroundColor: 'white',
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
    backgroundColor: 'white',
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
    backgroundColor: '#FFF0F5',
    padding: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFE5EC',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  reversiScoreLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 5,
  },
  reversiScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF1493',
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
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF1493',
  },
  drawingViewerCloseText: {
    fontSize: 24,
    color: '#FF1493',
    fontWeight: 'bold',
  },
  drawingViewerCanvas: {
    width: '90%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#FFE5EC',
    overflow: 'hidden',
  },
  wouldYouRatherPrompt: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 20,
  },
  wouldYouRatherOption: {
    backgroundColor: '#FFF0F5',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  wouldYouRatherLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 8,
  },
  wouldYouRatherOr: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginVertical: 10,
  },
  whosMoreLikelyQuestion: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 28,
  },
  whosMoreLikelyOption: {
    backgroundColor: '#FFF0F5',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFE5EC',
    alignItems: 'center',
  },
  whosMoreLikelyText: {
    fontSize: 18,
    color: '#FF1493',
    fontWeight: 'bold',
  },
  currentPlayerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
    textAlign: 'center',
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFF0F5',
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
    color: '#FF1493',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultsStatsBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  resultsStatsNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 5,
  },
  resultsStatsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
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
    backgroundColor: 'white',
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
    color: '#FF1493',
    backgroundColor: '#FFF0F5',
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
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: '#FFE5EC',
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
    backgroundColor: '#FF1493',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  resultAvatarP2: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF69B4',
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
    color: '#FF1493',
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
    backgroundColor: '#FF1493',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#FF1493',
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
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  resultsCloseBtnText: {
    color: '#FF1493',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
