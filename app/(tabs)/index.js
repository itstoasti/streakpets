import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getDeviceUserId, getCoupleData, saveCoupleData, clearAllData, getPetData, savePetData, getCurrency, saveCurrency, getOwnedPets, saveOwnedPets, getStreakData, saveStreakData, getCurrentPetType, saveCurrentPetType, getSpecificPetData, saveSpecificPetData } from '../../lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Animatable from 'react-native-animatable';

const PETS = {
  parrot: {
    name: 'Parrot',
    image: require('../../assets/parrot.png')
  },
  penguin: {
    name: 'Penguin',
    image: require('../../assets/penguin.png')
  },
  dog: {
    name: 'Dog',
    image: require('../../assets/dog.png')
  },
  cat: {
    name: 'Cat',
    image: require('../../assets/cat.png')
  },
  bunny: {
    name: 'Bunny',
    image: require('../../assets/bunny.png')
  },
  panda: {
    name: 'Panda',
    image: require('../../assets/panda.png')
  },
  fox: {
    name: 'Fox',
    image: require('../../assets/fox.png')
  },
  turtle: {
    name: 'Turtle',
    image: require('../../assets/turtle.png')
  },
  polar_bear: {
    name: 'Polar Bear',
    image: require('../../assets/polar_bear.png')
  },
};

export default function PetScreen() {
  const isFocused = useIsFocused();
  const [couple, setCouple] = useState(null);
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPairModal, setShowPairModal] = useState(false);
  const [showPetSelectModal, setShowPetSelectModal] = useState(false);
  const [showPetNameModal, setShowPetNameModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [selectedPetType, setSelectedPetType] = useState(null);
  const [petName, setPetName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [userId, setUserId] = useState(null);
  const [currency, setCurrency] = useState(0);
  const [streakData, setStreakData] = useState({ currentStreak: 0, lastActivityDate: null, streakRepairs: 0 });
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });
  const [showStreakCalendar, setShowStreakCalendar] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);

  useEffect(() => {
    loadUserData();
    const interval = setInterval(decayHappiness, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Reload pet data when tab comes into focus
  useEffect(() => {
    if (isFocused) {
      reloadPetData();
    }
  }, [isFocused]);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  function hideAlert() {
    setCustomAlert({ visible: false, title: '', message: '' });
  }

  async function reloadPetData() {
    try {
      const latestPet = await getPetData();
      const latestCurrency = await getCurrency();
      if (latestPet) {
        setPet(latestPet);
      }
      setCurrency(latestCurrency);
    } catch (err) {
      console.error('Error reloading pet data:', err);
    }
  }

  async function loadUserData() {
    try {
      // Get device user ID
      const deviceUserId = await getDeviceUserId();
      setUserId(deviceUserId);

      // Load currency and streak
      const userCurrency = await getCurrency();
      setCurrency(userCurrency);

      const streak = await getStreakData();
      await checkStreak(streak);
      setStreakData(streak);

      // Try to load from local storage first
      const localCouple = await getCoupleData();
      const localPet = await getPetData();

      if (isSupabaseConfigured()) {
        // Supabase mode - sync with database
        try {
          const { data: coupleData, error: coupleError } = await supabase
            .from('couples')
            .select('*')
            .or(`user1_id.eq.${deviceUserId},user2_id.eq.${deviceUserId}`)
            .single();

          if (coupleData && !coupleError) {
            setCouple(coupleData);
            await saveCoupleData(coupleData);

            // Load pet data
            const { data: petData } = await supabase
              .from('pets')
              .select('*')
              .eq('couple_id', coupleData.id)
              .single();

            if (petData) {
              setPet(petData);
              await savePetData(petData);
            } else {
              setShowPetSelectModal(true);
            }
          } else {
            // No couple found
            setShowPairModal(true);
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          setShowPairModal(true);
        }
      } else {
        // Local-only mode
        console.log('Running in local-only mode');
        if (localCouple) {
          setCouple(localCouple);
          if (localPet) {
            setPet(localPet);
          } else {
            setShowPetSelectModal(true);
          }
        } else {
          setShowPairModal(true);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError(err.message || 'Failed to load app. Check console.');
      setLoading(false);
    }
  }

  async function createCouple() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    if (isSupabaseConfigured()) {
      // Supabase mode
      const { data, error } = await supabase
        .from('couples')
        .insert({
          user1_id: userId,
          invite_code: code,
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setCouple(data);
      await saveCoupleData(data);
      showAlert('Success', `Share this code with your partner: ${code}`);
      await Clipboard.setStringAsync(code);
    } else {
      // Local-only mode
      const localCouple = {
        id: 'local_' + Date.now(),
        user1_id: userId,
        user2_id: null,
        invite_code: code,
        created_at: new Date().toISOString(),
      };

      setCouple(localCouple);
      await saveCoupleData(localCouple);
      setShowPairModal(false);
      setShowPetSelectModal(true);
      await Clipboard.setStringAsync(code);
    }
  }

  async function joinCouple() {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Local Mode',
        'Joining couples requires Supabase configuration. For now, just create a couple to test locally!'
      );
      return;
    }

    const { data: coupleData, error: fetchError } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (fetchError || !coupleData) {
      Alert.alert('Error', 'Invalid invite code');
      return;
    }

    if (coupleData.user2_id) {
      Alert.alert('Error', 'This couple is already complete');
      return;
    }

    const { error: updateError } = await supabase
      .from('couples')
      .update({ user2_id: userId })
      .eq('id', coupleData.id);

    if (updateError) {
      Alert.alert('Error', updateError.message);
      return;
    }

    const updatedCouple = { ...coupleData, user2_id: userId };
    setCouple(updatedCouple);
    await saveCoupleData(updatedCouple);
    setShowPairModal(false);
    setShowPetSelectModal(true);
    showAlert('Success', 'Joined couple! Now choose your pet together.');
  }

  function handlePetTypeSelect(petType) {
    setSelectedPetType(petType);
    setShowPetSelectModal(false);
    setShowPetNameModal(true);
  }

  async function confirmPetWithName() {
    if (!petName.trim()) {
      Alert.alert('Name Required', 'Please give your pet a name!');
      return;
    }

    const finalPetName = petName.trim();

    if (isSupabaseConfigured()) {
      // Supabase mode
      const { data, error } = await supabase
        .from('pets')
        .insert({
          couple_id: couple.id,
          pet_type: selectedPetType,
          pet_name: finalPetName,
          happiness: 50,
          last_decay: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setPet(data);
      await savePetData(data);
      setShowPetNameModal(false);
      setPetName('');
    } else {
      // Local-only mode
      const localPet = {
        id: 'local_pet_' + Date.now(),
        couple_id: couple.id,
        pet_type: selectedPetType,
        pet_name: finalPetName,
        happiness: 50,
        last_decay: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      setPet(localPet);
      await savePetData(localPet);
      setShowPetNameModal(false);
      setPetName('');
    }

    // Add to owned pets (first pet is free)
    const owned = await getOwnedPets();
    if (!owned.includes(selectedPetType)) {
      await saveOwnedPets([...owned, selectedPetType]);
    }
  }

  function handleEditName() {
    setPetName(pet.pet_name || PETS[pet.pet_type].name);
    setShowEditNameModal(true);
  }

  async function updatePetName() {
    if (!petName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your pet!');
      return;
    }

    const finalPetName = petName.trim();
    const updatedPet = { ...pet, pet_name: finalPetName };

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('pets')
        .update({ pet_name: finalPetName })
        .eq('id', pet.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
    }

    // Update local state and storage (works in both modes)
    setPet(updatedPet);
    await savePetData(updatedPet);

    // Save to pet-specific data
    if (pet.pet_type) {
      await saveSpecificPetData(pet.pet_type, {
        name: finalPetName,
        happiness: pet.happiness,
        last_decay: pet.last_decay,
      });
    }

    setShowEditNameModal(false);
    setPetName('');
    showAlert('Success!', `Your pet's name has been changed to ${finalPetName}!`);
  }

  async function feedPet() {
    if (!pet) return;

    // Check if pet is already at max happiness
    if (pet.happiness >= 100) {
      showAlert('Already Happy!', 'Your pet is at maximum happiness! 😊');
      return;
    }

    const newHappiness = Math.min(100, pet.happiness + 10);
    const updatedPet = {
      ...pet,
      happiness: newHappiness,
      last_fed: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      // Supabase mode
      const { error } = await supabase
        .from('pets')
        .update({
          happiness: newHappiness,
          last_fed: new Date().toISOString(),
        })
        .eq('id', pet.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
    }

    // Update local state and storage (works in both modes)
    setPet(updatedPet);
    await savePetData(updatedPet);

    // Save to pet-specific data
    if (pet.pet_type) {
      await saveSpecificPetData(pet.pet_type, {
        name: pet.pet_name,
        happiness: newHappiness,
        last_decay: pet.last_decay,
      });
    }

    // Give currency reward
    const newCurrency = currency + 5;
    setCurrency(newCurrency);
    await saveCurrency(newCurrency);

    showAlert('Yay!', 'Your pet is happier! 🎉\n+5 coins earned!');
  }

  async function decayHappiness() {
    if (!pet) return;

    const lastDecay = new Date(pet.last_decay || pet.created_at);
    const now = new Date();
    const hoursPassed = (now - lastDecay) / (1000 * 60 * 60);

    if (hoursPassed >= 1) {
      const decayAmount = Math.floor(hoursPassed) * 2;
      const newHappiness = Math.max(0, pet.happiness - decayAmount);
      const updatedPet = {
        ...pet,
        happiness: newHappiness,
        last_decay: now.toISOString(),
      };

      if (isSupabaseConfigured()) {
        // Supabase mode
        const { error } = await supabase
          .from('pets')
          .update({
            happiness: newHappiness,
            last_decay: now.toISOString(),
          })
          .eq('id', pet.id);

        if (error) {
          console.error('Error updating pet happiness:', error);
          return;
        }
      }

      // Update local state and storage (works in both modes)
      setPet(updatedPet);
      await savePetData(updatedPet);

      // Save to pet-specific data
      if (pet.pet_type) {
        await saveSpecificPetData(pet.pet_type, {
          name: pet.pet_name,
          happiness: newHappiness,
          last_decay: now.toISOString(),
        });
      }
    }
  }

  async function checkStreak(streak) {
    if (!streak.lastActivityDate) return;

    const lastDate = new Date(streak.lastActivityDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (daysDiff > 1) {
      // Streak is broken
      streak.currentStreak = 0;
      await saveStreakData(streak);
      setStreakData(streak);
    }
  }

  async function useStreakRepair() {
    if (streakData.streakRepairs <= 0) {
      showAlert('No Repairs', 'You need to buy Streak Repairs from the Shop!');
      return;
    }

    if (streakData.currentStreak > 0) {
      showAlert('Not Needed', 'Your streak is active! No need to repair.');
      return;
    }

    Alert.alert(
      'Use Streak Repair?',
      'This will restore your last streak. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Repair',
          onPress: async () => {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const bandaidDates = streakData.bandaidDates || [];

            const newStreakData = {
              ...streakData,
              currentStreak: 1,
              streakRepairs: streakData.streakRepairs - 1,
              lastActivityDate: new Date().toISOString(),
              bandaidDates: [...bandaidDates, dateStr],
            };
            await saveStreakData(newStreakData);
            setStreakData(newStreakData);
            showAlert('Success!', 'Streak repaired! 🩹');
          },
        },
      ]
    );
  }

  async function resetApp() {
    Alert.alert(
      'Reset App',
      'This will clear all local data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            setCouple(null);
            setPet(null);
            setShowPairModal(true);
            const newUserId = await getDeviceUserId();
            setUserId(newUserId);
          },
        },
      ]
    );
  }

  function renderCalendar() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Calculate streak dates
    const streakDates = [];
    const bandaidDates = streakData.bandaidDates || [];

    if (streakData.currentStreak > 0 && streakData.lastActivityDate) {
      const lastActivity = new Date(streakData.lastActivityDate);
      for (let i = 0; i < streakData.currentStreak; i++) {
        const streakDate = new Date(lastActivity);
        streakDate.setDate(lastActivity.getDate() - i);
        if (streakDate.getMonth() === currentMonth && streakDate.getFullYear() === currentYear) {
          streakDates.push(streakDate.getDate());
        }
      }
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Build calendar grid
    const calendarDays = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(
        <View key={`empty-${i}`} style={styles.calendarDay} />
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isStreakDay = streakDates.includes(day);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isBandaidDay = bandaidDates.includes(dateStr);
      const isToday = day === currentDay;

      calendarDays.push(
        <View
          key={day}
          style={[
            styles.calendarDay,
            isStreakDay && styles.calendarStreakDay,
            isToday && styles.calendarToday,
          ]}
        >
          <Text style={[
            styles.calendarDayText,
            isStreakDay && styles.calendarStreakText,
            isToday && styles.calendarTodayText,
          ]}>
            {day}
          </Text>
          {isBandaidDay && (
            <Text style={styles.calendarBandaid}>🩹</Text>
          )}
        </View>
      );
    }

    return (
      <View style={styles.calendar}>
        <Text style={styles.calendarMonthTitle}>
          {monthNames[currentMonth]} {currentYear}
        </Text>

        <View style={styles.calendarHeader}>
          {dayNames.map(day => (
            <Text key={day} style={styles.calendarHeaderDay}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays}
        </View>
      </View>
    );
  }

  function renderAchievements() {
    const achievements = [
      { id: 1, name: 'Getting Started', icon: '🌱', requirement: 3, description: '3 day streak' },
      { id: 2, name: 'Week Warrior', icon: '⭐', requirement: 7, description: '7 day streak' },
      { id: 3, name: 'Monthly Master', icon: '🔥', requirement: 30, description: '30 day streak' },
      { id: 4, name: 'Centurion', icon: '💪', requirement: 100, description: '100 day streak' },
      { id: 5, name: 'Half Year Hero', icon: '💎', requirement: 180, description: '180 day streak' },
      { id: 6, name: 'Lucky Streak', icon: '🍀', requirement: 222, description: '222 day streak' },
      { id: 7, name: 'Year Champion', icon: '👑', requirement: 365, description: '365 day streak' },
      { id: 8, name: 'Unstoppable', icon: '🚀', requirement: 500, description: '500 day streak' },
      { id: 9, name: 'Epic Journey', icon: '⚡', requirement: 750, description: '750 day streak' },
      { id: 10, name: 'Legendary', icon: '🏆', requirement: 1000, description: '1000 day streak' },
    ];

    const maxStreak = streakData.maxStreak || 0;

    return achievements.map(achievement => {
      const isUnlocked = maxStreak >= achievement.requirement;
      return (
        <View
          key={achievement.id}
          style={[
            styles.achievementCard,
            !isUnlocked && styles.achievementLocked,
          ]}
        >
          <Text style={[
            styles.achievementIcon,
            !isUnlocked && styles.achievementIconLocked,
          ]}>
            {isUnlocked ? achievement.icon : '🔒'}
          </Text>
          <View style={styles.achievementInfo}>
            <Text style={[
              styles.achievementName,
              !isUnlocked && styles.achievementTextLocked,
            ]}>
              {achievement.name}
            </Text>
            <Text style={[
              styles.achievementDescription,
              !isUnlocked && styles.achievementTextLocked,
            ]}>
              {achievement.description}
            </Text>
          </View>
          {isUnlocked && (
            <Text style={styles.achievementUnlocked}>✓</Text>
          )}
        </View>
      );
    });
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            loadUserData();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
        <Text style={styles.loadingSubtext}>Setting up your app...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#FFE5EC', '#FFF0F5']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {couple && pet ? (
          <View style={styles.petContainer}>
            <TouchableOpacity
              style={styles.currencyBadge}
              onPress={() => setShowCoinsModal(true)}
            >
              <Text style={styles.currencyBadgeText}>💰 {currency}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.streakBadge}
              onPress={() => setShowStreakCalendar(true)}
            >
              <Text style={styles.streakBadgeText}>🔥 {streakData.currentStreak} day streak</Text>
              {streakData.streakRepairs > 0 && (
                <TouchableOpacity onPress={useStreakRepair} style={styles.repairButton}>
                  <Text style={styles.repairButtonText}>🩹 {streakData.streakRepairs}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Animatable.View
              animation="pulse"
              iterationCount="infinite"
            >
              {PETS[pet.pet_type].image ? (
                <Image
                  source={PETS[pet.pet_type].image}
                  style={styles.petImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.petEmojiLarge}>{PETS[pet.pet_type].emoji}</Text>
              )}
            </Animatable.View>

            <TouchableOpacity onPress={handleEditName}>
              <Text style={styles.petNameDisplay}>
                {pet.pet_name || PETS[pet.pet_type].name}
              </Text>
            </TouchableOpacity>

            <View style={styles.happinessContainer}>
              <Text style={styles.happinessLabel}>Happiness</Text>
              <View style={styles.happinessBarContainer}>
                <View
                  style={[
                    styles.happinessBar,
                    { width: `${pet.happiness}%` }
                  ]}
                />
              </View>
              <Text style={styles.happinessText}>{pet.happiness}/100</Text>
            </View>

            <TouchableOpacity style={styles.feedButton} onPress={feedPet}>
              <Text style={styles.feedButtonText}>Feed Pet 🍎 (+10)</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Play games, share notes, and add memories to keep your pet happy!
              </Text>
              <Text style={styles.infoText}>
                ⚠️ Happiness decreases by 2 points every hour.
              </Text>
            </View>

            {couple && (
              <View style={styles.coupleInfo}>
                <Text style={styles.coupleText}>
                  Invite Code: {couple.invite_code}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setStringAsync(couple.invite_code);
                    showAlert('Copied!', 'Invite code copied to clipboard');
                  }}
                  style={styles.copyButton}
                >
                  <Text style={styles.copyButtonText}>Copy Code</Text>
                </TouchableOpacity>
                <Text style={styles.deviceIdText}>Device ID: {userId}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={resetApp}>
              <Text style={styles.resetText}>Reset App (Testing)</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Pairing Modal */}
      <Modal visible={showPairModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Couple Pairing</Text>
            <Text style={styles.modalSubtitle}>
              Create a couple or join using your partner's code
            </Text>

            <TouchableOpacity style={styles.button} onPress={createCouple}>
              <Text style={styles.buttonText}>Create Couple & Get Code</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <Text style={styles.dividerText}>OR</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter Partner's Code"
              placeholderTextColor="#FF9EBB"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />

            <TouchableOpacity style={styles.button} onPress={joinCouple}>
              <Text style={styles.buttonText}>Join Couple</Text>
            </TouchableOpacity>

            <Text style={styles.deviceIdInfo}>Your Device ID: {userId}</Text>
          </View>
        </View>
      </Modal>

      {/* Pet Selection Modal */}
      <Modal visible={showPetSelectModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Your Pet!</Text>
            <Text style={styles.modalSubtitle}>
              Pick a pet to take care of together
            </Text>

            <View style={styles.petOptions}>
              {Object.entries(PETS).map(([type, petData]) => (
                <TouchableOpacity
                  key={type}
                  style={styles.petOption}
                  onPress={() => handlePetTypeSelect(type)}
                >
                  {petData.image ? (
                    <Image
                      source={petData.image}
                      style={styles.petOptionImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.petOptionEmoji}>{petData.emoji}</Text>
                  )}
                  <Text style={styles.petOptionText}>{petData.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Pet Naming Modal */}
      <Modal visible={showPetNameModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name Your Pet!</Text>
            <Text style={styles.modalSubtitle}>
              Choose a special name together
            </Text>

            {selectedPetType && (
              <View style={styles.selectedPetPreview}>
                {PETS[selectedPetType].image ? (
                  <Image
                    source={PETS[selectedPetType].image}
                    style={styles.petPreviewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.petPreviewEmoji}>{PETS[selectedPetType].emoji}</Text>
                )}
              </View>
            )}

            <TextInput
              style={styles.nameInput}
              placeholder="Enter pet name..."
              placeholderTextColor="#FFB6D9"
              value={petName}
              onChangeText={setPetName}
              maxLength={20}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPetNameModal(false);
                  setShowPetSelectModal(true);
                  setPetName('');
                }}
              >
                <Text style={styles.modalButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmPetWithName}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Pet Name Modal */}
      <Modal visible={showEditNameModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Your Pet</Text>
            <Text style={styles.modalSubtitle}>
              Give your pet a new name
            </Text>

            {pet && (
              <View style={styles.selectedPetPreview}>
                {PETS[pet.pet_type].image ? (
                  <Image
                    source={PETS[pet.pet_type].image}
                    style={styles.petPreviewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.petPreviewEmoji}>{PETS[pet.pet_type].emoji}</Text>
                )}
              </View>
            )}

            <TextInput
              style={styles.nameInput}
              placeholder="Enter new name..."
              placeholderTextColor="#FFB6D9"
              value={petName}
              onChangeText={setPetName}
              maxLength={20}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditNameModal(false);
                  setPetName('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={updatePetName}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal visible={customAlert.visible} animationType="fade" transparent>
        <View style={styles.alertOverlay}>
          <Animatable.View
            animation="bounceIn"
            duration={500}
            style={styles.alertBox}
          >
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={hideAlert}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>

      {/* Streak Calendar Modal */}
      <Modal visible={showStreakCalendar} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.calendarModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Streak Calendar</Text>
              <TouchableOpacity onPress={() => setShowStreakCalendar(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsCardsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statCardIcon}>🔥</Text>
                <Text style={styles.statCardValue}>{streakData.currentStreak}</Text>
                <Text style={styles.statCardLabel}>Current Streak</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statCardIcon}>🏆</Text>
                <Text style={styles.statCardValue}>{streakData.maxStreak || 0}</Text>
                <Text style={styles.statCardLabel}>Longest Streak</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statCardIcon}>🩹</Text>
                <Text style={styles.statCardValue}>{streakData.streakRepairs}</Text>
                <Text style={styles.statCardLabel}>Repairs</Text>
              </View>
            </View>

            <ScrollView style={styles.calendarScroll}>
              {renderCalendar()}

              <View style={styles.calendarLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#FF1493' }]} />
                  <Text style={styles.legendText}>Streak Day</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#FFE5EC' }]}>
                    <Text style={styles.legendBandaid}>🩹</Text>
                  </View>
                  <Text style={styles.legendText}>Repaired Day</Text>
                </View>
              </View>

              <View style={styles.achievementsSection}>
                <Text style={styles.achievementsTitle}>Achievements</Text>
                {renderAchievements()}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowStreakCalendar(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Coins Modal */}
      <Modal visible={showCoinsModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.coinsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Coin Balance</Text>
              <TouchableOpacity onPress={() => setShowCoinsModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.coinBalanceDisplay}>
              <Text style={styles.coinBalanceText}>💰</Text>
              <Text style={styles.coinBalanceAmount}>{currency}</Text>
              <Text style={styles.coinBalanceLabel}>Coins</Text>
            </View>

            <View style={styles.coinOptions}>
              <TouchableOpacity
                style={styles.coinOptionCard}
                onPress={() => {
                  showAlert('Coming Soon!', 'Watch ads to earn coins - feature coming soon!');
                  setShowCoinsModal(false);
                }}
              >
                <Text style={styles.coinOptionIcon}>📺</Text>
                <Text style={styles.coinOptionTitle}>Watch Ad</Text>
                <Text style={styles.coinOptionReward}>+10 Coins</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.coinOptionCard}
                onPress={() => {
                  showAlert('Coming Soon!', 'Purchase coins - feature coming soon!');
                  setShowCoinsModal(false);
                }}
              >
                <Text style={styles.coinOptionIcon}>💳</Text>
                <Text style={styles.coinOptionTitle}>Buy Coins</Text>
                <Text style={styles.coinOptionReward}>Coming Soon</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowCoinsModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FF1493',
    fontWeight: 'bold',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#FF69B4',
    marginTop: 10,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF69B4',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 15,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollContent: {
    flexGrow: 0,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  petContainer: {
    alignItems: 'center',
  },
  currencyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFE5EC',
    zIndex: 10,
  },
  currencyBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  streakBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFE5EC',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  repairButton: {
    marginLeft: 8,
    backgroundColor: '#FFE5EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  repairButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  petImage: {
    width: 400,
    height: 400,
    marginTop: 60,
    marginBottom: 5,
  },
  petEmojiLarge: {
    fontSize: 200,
    marginTop: 60,
    marginBottom: 5,
  },
  happinessContainer: {
    width: '100%',
    marginBottom: 15,
  },
  happinessLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 10,
  },
  happinessBarContainer: {
    height: 30,
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFB6D9',
  },
  happinessBar: {
    height: '100%',
    backgroundColor: '#FF1493',
  },
  happinessText: {
    fontSize: 16,
    color: '#FF69B4',
    textAlign: 'center',
    marginTop: 5,
  },
  feedButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 8,
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  feedButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  infoText: {
    fontSize: 14,
    color: '#FF69B4',
    marginBottom: 5,
  },
  coupleInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFE5EC',
    width: '100%',
    alignItems: 'center',
  },
  coupleText: {
    fontSize: 16,
    color: '#FF1493',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  copyButton: {
    backgroundColor: '#FFE5EC',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  copyButtonText: {
    color: '#FF1493',
    fontWeight: 'bold',
  },
  deviceIdText: {
    fontSize: 10,
    color: '#FF69B4',
    marginTop: 5,
  },
  deviceIdInfo: {
    fontSize: 10,
    color: '#FF69B4',
    marginTop: 15,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 3,
    marginBottom: 0,
  },
  resetText: {
    color: '#FF69B4',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#FF69B4',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF1493',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerText: {
    color: '#FFB6D9',
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#FFF0F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#FFB6D9',
    textAlign: 'center',
  },
  petOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  petOption: {
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  petOptionImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  petOptionEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  petOptionText: {
    color: '#FF1493',
    fontWeight: 'bold',
  },
  petNameDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  selectedPetPreview: {
    alignItems: 'center',
    marginVertical: 20,
  },
  petPreviewImage: {
    width: 120,
    height: 120,
  },
  petPreviewEmoji: {
    fontSize: 80,
  },
  nameInput: {
    backgroundColor: '#FFF0F5',
    borderRadius: 15,
    padding: 15,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#FFB6D9',
    width: '100%',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#FF1493',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFB6D9',
  },
  confirmButton: {
    backgroundColor: '#FF1493',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  alertBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF1493',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 15,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#FF69B4',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24,
  },
  alertButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 15,
    minWidth: 120,
  },
  alertButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    fontSize: 28,
    color: '#FF1493',
    fontWeight: 'bold',
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 500,
  },
  statsCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF0F5',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  statCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 11,
    color: '#FF69B4',
    fontWeight: '600',
    textAlign: 'center',
  },
  calendarContainer: {
    minHeight: 200,
    backgroundColor: '#FFF0F5',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarInfo: {
    fontSize: 14,
    color: '#FF69B4',
    textAlign: 'center',
    lineHeight: 22,
  },
  closeModalButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  coinsModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
  },
  coinBalanceDisplay: {
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    padding: 30,
    borderRadius: 20,
    marginBottom: 25,
    borderWidth: 3,
    borderColor: '#FFE5EC',
  },
  coinBalanceText: {
    fontSize: 60,
    marginBottom: 10,
  },
  coinBalanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 5,
  },
  coinBalanceLabel: {
    fontSize: 18,
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  coinOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  coinOptionCard: {
    flex: 1,
    backgroundColor: '#FFF0F5',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  coinOptionIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  coinOptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 5,
  },
  coinOptionReward: {
    fontSize: 12,
    color: '#FF69B4',
  },
  calendarScroll: {
    maxHeight: 400,
  },
  calendar: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  calendarMonthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 15,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarHeaderDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    position: 'relative',
  },
  calendarStreakDay: {
    backgroundColor: '#FF1493',
    borderRadius: 8,
  },
  calendarToday: {
    borderWidth: 2,
    borderColor: '#FF69B4',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  calendarStreakText: {
    color: 'white',
    fontWeight: 'bold',
  },
  calendarTodayText: {
    fontWeight: 'bold',
  },
  calendarBandaid: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 10,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF0F5',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendBandaid: {
    fontSize: 12,
  },
  legendText: {
    fontSize: 12,
    color: '#FF69B4',
    fontWeight: '500',
  },
  achievementsSection: {
    marginTop: 20,
  },
  achievementsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 15,
    textAlign: 'center',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  achievementLocked: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  achievementIconLocked: {
    opacity: 0.5,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#FF69B4',
  },
  achievementTextLocked: {
    color: '#999',
  },
  achievementUnlocked: {
    fontSize: 24,
    color: '#32CD32',
    fontWeight: 'bold',
  },
});
