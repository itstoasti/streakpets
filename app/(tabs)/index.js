import { useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
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
  ActivityIndicator,
  Share,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getCoupleData, saveCoupleData, clearAllData, getPetData, savePetData, getCurrency, saveCurrency, getOwnedPets, saveOwnedPets, getStreakData, saveStreakData, getCurrentPetType, saveCurrentPetType, getSpecificPetData, saveSpecificPetData } from '../../lib/storage';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { getMyPendingTurns } from '../../lib/gameHelper';
import { useRewardedAd } from '../../lib/rewardedAds';
import { TicTacToeGame, ConnectFourGame, ReversiGame, DotsAndBoxesGame, WhiteboardGame, CheckersGame, MemoryMatchGame } from './activity';
import { TriviaGame } from '../../components/games/TriviaGame';
import { WouldYouRatherGame } from '../../components/games/WouldYouRatherGame';
import { WhosMoreLikelyGame } from '../../components/games/WhosMoreLikelyGame';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';

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
  const navigation = useNavigation();
  const router = useRouter();
  const { signOut } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
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
  const [streakData, setStreakData] = useState({ currentStreak: 0, lastActivityDate: null, streakRepairs: 0, activityDates: [] });
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });
  const [showStreakCalendar, setShowStreakCalendar] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);

  // Rewarded ads setup
  const { loaded: adLoaded, loading: adLoading, showAd } = useRewardedAd(async (rewardAmount, silent) => {
    // User watched the ad and earned a reward
    const currentCurrency = await getCurrency();
    const newCurrency = currentCurrency + 10; // Award 10 coins
    setCurrency(newCurrency);
    await saveCurrency(newCurrency);
    // Only show alert if not silent (silent is true for non-active tabs to prevent duplicate popups)
    if (!silent) {
      showAlert('Coins Earned! 🎉', 'You earned 10 coins for watching the ad!');
    }
  });

  const [userEmail, setUserEmail] = useState('');
  const [showLeaveCoupleModal, setShowLeaveCoupleModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [showChangePetModal, setShowChangePetModal] = useState(false);
  const [allPets, setAllPets] = useState([]);
  const [ownedPets, setOwnedPets] = useState([]);
  const [pendingGames, setPendingGames] = useState([]);
  const [showHappinessInfoModal, setShowHappinessInfoModal] = useState(false);
  const [showTicTacToe, setShowTicTacToe] = useState(false);
  const [showConnectFour, setShowConnectFour] = useState(false);
  const [showReversi, setShowReversi] = useState(false);
  const [showDotsAndBoxes, setShowDotsAndBoxes] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showCheckers, setShowCheckers] = useState(false);
  const [showMemoryMatch, setShowMemoryMatch] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);
  const [showWouldYouRather, setShowWouldYouRather] = useState(false);
  const [showWhosMoreLikely, setShowWhosMoreLikely] = useState(false);

  const handleShareInviteCode = async () => {
    if (couple?.invite_code) {
      try {
        await Share.share({
          message: `Join me on Spark! My invite code is: ${couple.invite_code}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  // Set up header button for profile
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          style={{ marginRight: 15 }}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle" size={28} color={theme.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  useEffect(() => {
    loadUserData();
    const interval = setInterval(decayHappiness, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Reload currency when tab becomes focused (for real-time updates from other tabs)
  useEffect(() => {
    if (isFocused) {
      getCurrency().then(setCurrency);
    }
  }, [isFocused]);

  // Poll for pet and couple updates every 10 seconds, only when tab is focused
  useEffect(() => {
    if (!couple || !isSupabaseConfigured() || !isFocused) return;

    let isMounted = true;

    const pollInterval = setInterval(async () => {
      if (!isFocused) return; // Skip polling if tab is not focused

      try {
        // Poll for EQUIPPED pet (in case it changed on another device)
        const { data: petData } = await supabase
          .from('pets')
          .select('*')
          .eq('couple_id', couple.id)
          .eq('is_equipped', true)
          .maybeSingle();

        if (petData && isMounted) {
          // Check if pet actually changed
          if (!pet || pet.id !== petData.id || pet.happiness !== petData.happiness || pet.pet_name !== petData.pet_name) {
            console.log('🔄 Pet changed or updated:', petData.pet_name, 'Happiness:', petData.happiness);
            setPet(petData);
            savePetData(petData);
          }
        }

        // Poll for couple updates
        const { data: coupleData } = await supabase
          .from('couples')
          .select('*')
          .eq('id', couple.id)
          .single();

        if (coupleData && isMounted) {
          setCouple(coupleData);
          saveCoupleData(coupleData);
          // Update streak display
          setStreakData({
            currentStreak: coupleData.current_streak || 0,
            lastActivityDate: coupleData.last_activity_date || null,
            streakRepairs: 0,
          });
        }
      } catch (error) {
        // Ignore errors during polling (component might be unmounting)
      }
    }, 10000); // Poll every 10 seconds

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [couple?.id, isFocused]);

  // Reload pet data when tab comes into focus
  useEffect(() => {
    if (isFocused) {
      reloadPetData();
    }
  }, [isFocused]);

  // Load pending games
  useEffect(() => {
    async function loadPendingGames() {
      if (!couple || !userId || !isFocused) return;
      try {
        const games = await getMyPendingTurns(couple.id, userId);
        setPendingGames(games || []);
      } catch (error) {
        console.error('Error loading pending games:', error);
      }
    }
    loadPendingGames();
    // Poll every 10 seconds
    const interval = setInterval(loadPendingGames, 10000);
    return () => clearInterval(interval);
  }, [couple?.id, userId, isFocused]);

  // Real-time subscription for pet changes
  useEffect(() => {
    if (!couple || !isSupabaseConfigured()) return;

    const subscription = supabase
      .channel(`pet_changes_${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pets',
          filter: `couple_id=eq.${couple.id}`,
        },
        async (payload) => {
          console.log('🔔 Pet update received:', payload.new);
          // Check if the updated pet is now equipped
          if (payload.new.is_equipped) {
            console.log('🔄 Equipped pet changed to:', payload.new.pet_name);
            setPet(payload.new);
            await savePetData(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Pet subscription status:', status);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [couple?.id]);



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
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('Auth error:', authError);
        setError('Authentication required');
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email);

      // Load currency and streak
      const userCurrency = await getCurrency();
      setCurrency(userCurrency);

      const streak = await getStreakData();
      await checkStreak(streak);
      setStreakData(streak);

      // Load owned pets
      const owned = await getOwnedPets();
      setOwnedPets(owned || []);

      // Try to load from local storage first
      const localCouple = await getCoupleData();
      const localPet = await getPetData();

      if (isSupabaseConfigured()) {
        // Supabase mode - sync with database
        let coupleData = null;
        let petData = null;

        // Query couple data - get all and use the most recent one
        try {
          const { data, error: coupleError } = await supabase
            .from('couples')
            .select('*')
            .or(`auth_user1_id.eq.${user.id},auth_user2_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(1);

          console.log('Couple query result:', {
            data,
            coupleError: coupleError?.message,
            userId: user.id,
            rowCount: data?.length
          });

          if (coupleError) {
            console.error('Couple query error:', coupleError);
          } else if (data && data.length > 0) {
            coupleData = data[0];
            if (data.length > 1) {
              console.warn('⚠️ User has multiple couples! Using most recent one.');
            }
          }
        } catch (err) {
          console.error('Exception querying couples:', err);
        }

        // Process couple data
        if (coupleData) {
          console.log('✅ Found couple:', coupleData.id);
          setCouple(coupleData);
          try {
            await saveCoupleData(coupleData);
          } catch (err) {
            console.error('Error saving couple locally:', err);
          }

          // Fetch partner email
          try {
            const partnerId = coupleData.auth_user1_id === user.id
              ? coupleData.auth_user2_id
              : coupleData.auth_user1_id;

            if (partnerId) {
              const { data: partnerData } = await supabase.auth.admin.getUserById(partnerId);
              if (partnerData?.user?.email) {
                setPartnerEmail(partnerData.user.email);
              }
            }
          } catch (err) {
            // Partner email fetch is not critical, just log the error
            console.log('Could not fetch partner email:', err.message);
          }

          // Query equipped pet data
          try {
            const { data, error: petError } = await supabase
              .from('pets')
              .select('*')
              .eq('couple_id', coupleData.id)
              .eq('is_equipped', true)
              .maybeSingle();

            console.log('Pet query result:', {
              data: data ? { id: data.id, name: data.pet_name, type: data.pet_type } : null,
              petError: petError?.message
            });

            if (petError && petError.code !== 'PGRST116') {
              console.error('Pet query error:', petError);
            } else {
              petData = data;
            }
          } catch (err) {
            console.error('Exception querying pets:', err);
          }

          // Process pet data
          if (petData) {
            console.log('✅ Loaded pet from Supabase:', petData.pet_name);
            setPet(petData);
            try {
              await savePetData(petData);
            } catch (err) {
              console.error('Error saving pet locally:', err);
            }
            console.log('🚪 Closing all modals - user has couple and pet');
            setShowPairModal(false);
            setShowPetSelectModal(false);
          } else if (localPet) {
            console.log('⚠️ Using local pet data as fallback:', localPet.pet_name);
            setPet(localPet);
            console.log('🚪 Closing all modals - using local pet');
            setShowPairModal(false);
            setShowPetSelectModal(false);
          } else {
            console.log('ℹ️ No pet found for this couple, showing pet select modal');
            setShowPairModal(false);
            setShowPetSelectModal(true);
          }
        } else {
          console.log('❌ No couple found for user, showing pair modal');
          setShowPairModal(true);
          setShowPetSelectModal(false);
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

    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Configuration Error',
        'App is not properly configured. Please check your setup.'
      );
      return;
    }

    try {
      const { data, error } = await supabase
        .from('couples')
        .insert({
          auth_user1_id: userId,
          invite_code: code,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create couple:', error.message, error);
        Alert.alert(
          'Failed to Create Couple',
          'Could not save your couple. Please check your internet connection and try again.\n\nError: ' + error.message
        );
        return;
      }

      setCouple(data);
      await saveCoupleData(data);
      setShowPairModal(false);
      setShowPetSelectModal(true);
      showAlert('Success', `Share this code with your partner: ${code}`);
      await Clipboard.setStringAsync(code);
    } catch (err) {
      console.error('Unexpected error creating couple:', err);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.\n\nError: ' + err.message
      );
    }
  }

  function createLocalCouple(code) {
    const localCouple = {
      id: 'local_' + Date.now(),
      auth_user1_id: userId,
      auth_user2_id: null,
      invite_code: code,
      created_at: new Date().toISOString(),
    };

    setCouple(localCouple);
    saveCoupleData(localCouple);
    setShowPairModal(false);
    setShowPetSelectModal(true);
    Clipboard.setStringAsync(code);
  }

  async function joinCouple() {
    const trimmedCode = inviteCode.trim().toUpperCase();

    if (!trimmedCode) {
      showAlert('Missing Code', 'Please enter an invite code to join a couple.');
      return;
    }

    if (!isSupabaseConfigured()) {
      showAlert(
        'Configuration Error',
        'App is not properly configured. Please check your setup.'
      );
      return;
    }

    console.log('🔍 Attempting to join couple with code:', trimmedCode);

    try {
      // First, check if user is already in ANY couples (could be multiple from testing)
      const { data: existingCouples, error: existingError } = await supabase
        .from('couples')
        .select('*')
        .or(`auth_user1_id.eq.${userId},auth_user2_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (existingError) {
        console.error('Error checking existing couples:', existingError);
      } else if (existingCouples && existingCouples.length > 0) {
        console.log(`⚠️ User is in ${existingCouples.length} couple(s)`);

        // Check each couple for a pet
        let hasActiveCoupleWithPet = false;
        const couplesToCleanup = [];

        for (const couple of existingCouples) {
          const { data: pet } = await supabase
            .from('pets')
            .select('*')
            .eq('couple_id', couple.id)
            .maybeSingle();

          if (pet) {
            // This couple has a pet - it's active
            hasActiveCoupleWithPet = true;
            console.log(`✅ Found active couple with pet: ${couple.id}`);
            break;
          } else {
            // No pet - mark for cleanup
            couplesToCleanup.push(couple);
          }
        }

        if (hasActiveCoupleWithPet) {
          // User has at least one active couple with a pet
          console.log('🚫 Blocking join - user has active couple with pet');
          setInviteCode(''); // Clear the input
          showAlert(
            'Already Paired',
            'You are already in an active couple! Please leave your current couple before joining a new one.\n\nGo to Profile > Leave Couple to exit your current pairing.'
          );
          return;
        }

        // Clean up ALL incomplete couples
        if (couplesToCleanup.length > 0) {
          console.log(`🧹 Auto-cleaning ${couplesToCleanup.length} incomplete couple(s)...`);

          for (const couple of couplesToCleanup) {
            if (couple.auth_user1_id === userId) {
              // User is creator - delete the couple
              await supabase.from('couples').delete().eq('id', couple.id);
              console.log(`  ✅ Deleted couple: ${couple.id}`);
            } else {
              // User is joiner - remove themselves
              await supabase.from('couples').update({ auth_user2_id: null }).eq('id', couple.id);
              console.log(`  ✅ Left couple: ${couple.id}`);
            }
          }

          // Clear local data
          await saveCoupleData(null);
          await savePetData(null);

          console.log('✅ All incomplete couples cleaned up, proceeding with join...');
        }
      }

      // Try to find the couple with this invite code
      const { data: coupleData, error: fetchError } = await supabase
        .from('couples')
        .select('*')
        .eq('invite_code', trimmedCode)
        .maybeSingle();

      console.log('Couple lookup result:', {
        found: !!coupleData,
        error: fetchError?.message,
        code: trimmedCode
      });

      if (fetchError) {
        console.error('Database error fetching couple:', fetchError);
        showAlert('Error', 'Unable to search for invite code. Please check your internet connection and try again.');
        return;
      }

      if (!coupleData) {
        console.log('❌ No couple found with code:', trimmedCode);
        showAlert(
          'Invalid Code',
          `The invite code "${trimmedCode}" was not found.\n\nPlease check that you entered it correctly and try again.`
        );
        return;
      }

      // Check if couple is already full
      if (coupleData.auth_user2_id) {
        console.log('⚠️ Couple is already full');
        showAlert(
          'Couple Full',
          'This couple already has 2 people paired together.\n\nOnly 2 people can share a couple. Please ask for a different invite code or create your own couple.'
        );
        return;
      }

      // Check if user is trying to join their own couple
      if (coupleData.auth_user1_id === userId) {
        console.log('⚠️ User trying to join their own couple');
        showAlert(
          'Your Own Code',
          'This is your own invite code! Share this code with your partner so they can join you.'
        );
        return;
      }

      console.log('✅ Valid couple found, joining...');

      // Join the couple
      const { error: updateError } = await supabase
        .from('couples')
        .update({ auth_user2_id: userId })
        .eq('id', coupleData.id);

      if (updateError) {
        console.error('Error joining couple:', updateError);
        showAlert('Error', 'Could not join couple. Please try again.\n\nError: ' + updateError.message);
        return;
      }

      console.log('✅ Successfully joined couple!');

      const updatedCouple = { ...coupleData, auth_user2_id: userId };
      setCouple(updatedCouple);
      await saveCoupleData(updatedCouple);
      setShowPairModal(false);

      // Check if couple already has a pet
      const { data: existingPet } = await supabase
        .from('pets')
        .select('*')
        .eq('couple_id', updatedCouple.id)
        .maybeSingle();

      if (existingPet) {
        // Couple already has a pet, load it
        setPet(existingPet);
        await savePetData(existingPet);
        showAlert('Success', 'Joined couple! Welcome! 💕');
      } else {
        // No pet yet, show selection
        setShowPetSelectModal(true);
        showAlert('Success', 'Joined couple! Now choose your pet together.');
      }

      setInviteCode('');
    } catch (err) {
      console.error('Unexpected error joining couple:', err);
      showAlert('Error', 'An unexpected error occurred. Please try again.\n\nError: ' + err.message);
    }
  }

  async function loadAllPets() {
    if (!couple) return;

    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('couple_id', couple.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading all pets:', error);
        return;
      }

      setAllPets(data || []);
    } catch (err) {
      console.error('Exception loading all pets:', err);
    }
  }

  async function switchToPet(petId) {
    if (!couple) return;

    try {
      // Unequip all pets
      await supabase
        .from('pets')
        .update({ is_equipped: false })
        .eq('couple_id', couple.id);

      // Equip the selected pet
      const { data, error } = await supabase
        .from('pets')
        .update({ is_equipped: true })
        .eq('id', petId)
        .select()
        .single();

      if (error) {
        showAlert('Error', 'Failed to switch pet. Please try again.');
        return;
      }

      console.log('✅ Switched to pet:', data.pet_name, 'Happiness:', data.happiness);

      // Update local state and UI
      setPet(data);
      await savePetData(data);
      setShowChangePetModal(false);

      // Force UI refresh by reloading user data
      setTimeout(() => {
        loadUserData();
      }, 100);

      showAlert('Success!', `Switched to ${data.pet_name}!`);
    } catch (err) {
      console.error('Error switching pet:', err);
      showAlert('Error', 'An unexpected error occurred.');
    }
  }

  async function leaveCouple() {
    if (!couple || !userId) return;

    if (!isSupabaseConfigured()) {
      showAlert(
        'Configuration Error',
        'App is not properly configured. Please check your setup.'
      );
      return;
    }

    try {
      const isUser1 = couple.auth_user1_id === userId;
      const isUser2 = couple.auth_user2_id === userId;

      console.log('🚪 Leaving couple:', { isUser1, isUser2, coupleId: couple.id });

      if (isUser2) {
        // User 2 leaving - just remove them from the couple
        console.log('Setting auth_user2_id to null...');
        const { error, data } = await supabase
          .from('couples')
          .update({ auth_user2_id: null })
          .eq('id', couple.id)
          .select();

        console.log('Update result:', { error, data });

        if (error) {
          console.error('Error leaving couple:', error);
          showAlert('Error', 'Failed to leave couple. Please try again.');
          return;
        }
      } else if (isUser1) {
        // User 1 leaving - delete the entire couple and associated data
        console.log('Deleting couple and all associated data...');

        // Delete pet first (foreign key constraint)
        if (pet) {
          const { error: petError } = await supabase.from('pets').delete().eq('couple_id', couple.id);
          console.log('Pet delete result:', petError);
        }

        // Delete games
        const { error: gamesError } = await supabase.from('games').delete().eq('couple_id', couple.id);
        console.log('Games delete result:', gamesError);

        // Delete notes
        const { error: notesError } = await supabase.from('notes').delete().eq('couple_id', couple.id);
        console.log('Notes delete result:', notesError);

        // Delete memories
        const { error: memoriesError } = await supabase.from('memories').delete().eq('couple_id', couple.id);
        console.log('Memories delete result:', memoriesError);

        // Delete whiteboard drawings
        const { error: drawingsError } = await supabase.from('whiteboard_drawings').delete().eq('couple_id', couple.id);
        console.log('Drawings delete result:', drawingsError);

        // Finally delete the couple
        const { error, data } = await supabase
          .from('couples')
          .delete()
          .eq('id', couple.id)
          .select();

        console.log('Couple delete result:', { error, data });

        if (error) {
          console.error('Error deleting couple:', error);
          showAlert('Error', 'Failed to leave couple. Please try again.');
          return;
        }
      }

      console.log('✅ Successfully left couple in database');

      // Clear only couple-related local data, not auth data
      await saveCoupleData(null);
      await savePetData(null);
      await saveStreakData({ currentStreak: 0, lastActivityDate: null, streakRepairs: 0 });
      await saveCurrency(100); // Reset to default currency

      // Reset state immediately
      setCouple(null);
      setPet(null);
      setPartnerEmail('');
      setShowLeaveCoupleModal(false);
      setShowProfileModal(false);
      setLoading(false);

      console.log('✅ State reset complete');

      // Show pairing modal so user can create/join a new couple
      setTimeout(() => {
        setShowPairModal(true);
      }, 500);

      showAlert('Success', 'You have left the couple. You can now create or join a new couple.');

      // Don't reload - user already has no couple
      setError(null);
    } catch (error) {
      console.error('Error leaving couple:', error);
      showAlert('Error', 'An unexpected error occurred. Please try again.');
    }
  }

  async function deleteAccount() {
    try {
      console.log('🗑️ Starting account deletion...');

      if (!user) {
        showAlert('Error', 'No user logged in');
        return;
      }

      // First leave the couple (this deletes couple-related data)
      if (couple) {
        // Delete pet if exists
        if (pet) {
          await supabase.from('pets').delete().eq('id', pet.id);
        }

        // Delete memories
        await supabase.from('memories').delete().eq('couple_id', couple.id);

        // Delete conversation games
        await supabase.from('conversation_games').delete().eq('couple_id', couple.id);

        // Delete whiteboard drawings
        await supabase.from('whiteboard_drawings').delete().eq('couple_id', couple.id);

        // Delete game invites
        await supabase.from('game_invites').delete().eq('couple_id', couple.id);

        // Delete couple
        await supabase.from('couples').delete().eq('id', couple.id);
      }

      // Clear local data
      await saveCoupleData(null);
      await savePetData(null);
      await saveStreakData({ currentStreak: 0, lastActivityDate: null, streakRepairs: 0 });
      await saveCurrency(0);

      // Sign out and delete auth account
      // Note: Full account deletion requires calling a Supabase Edge Function or server-side code
      // For now, we sign out the user - they can request full deletion via email
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('Error signing out:', signOutError);
      }

      console.log('✅ Account data deleted, user signed out');
      setShowDeleteAccountModal(false);
      setShowSettingsModal(false);
      showAlert('Account Deleted', 'Your account and all data have been deleted.');

    } catch (error) {
      console.error('Error deleting account:', error);
      showAlert('Error', 'Failed to delete account. Please try again or contact support.');
    }
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

    if (!isSupabaseConfigured()) {
      Alert.alert(
        'Configuration Error',
        'App is not properly configured. Please check your setup.'
      );
      return;
    }

    try {
      console.log('🔄 Creating new pet:', selectedPetType, 'named:', finalPetName);

      // First, unequip all existing pets for this couple
      const { error: unequipError } = await supabase
        .from('pets')
        .update({ is_equipped: false })
        .eq('couple_id', couple.id);

      if (unequipError) {
        console.error('Error unequipping pets:', unequipError);
      } else {
        console.log('✅ Unequipped all existing pets');
      }

      // Now create the new pet as equipped
      const { data, error } = await supabase
        .from('pets')
        .insert({
          couple_id: couple.id,
          pet_type: selectedPetType,
          pet_name: finalPetName,
          happiness: 50,
          last_decay: new Date().toISOString(),
          is_equipped: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create pet:', error.message, error);
        Alert.alert(
          'Failed to Create Pet',
          'Could not save your pet. Please check your internet connection and try again.\n\nError: ' + error.message
        );
        return;
      }

      console.log('✅ Created new pet:', data.pet_name, 'Type:', data.pet_type, 'ID:', data.id);

      // Update local state
      setPet(data);
      await savePetData(data);
      setShowPetNameModal(false);
      setPetName('');

      // Add to owned pets
      const owned = await getOwnedPets();
      if (!owned.includes(selectedPetType)) {
        await saveOwnedPets([...owned, selectedPetType]);
        setOwnedPets([...owned, selectedPetType]);
      }

      // Force UI refresh
      console.log('🔄 Forcing UI refresh...');
      setTimeout(() => {
        loadUserData();
      }, 200);
    } catch (err) {
      console.error('Unexpected error creating pet:', err);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.\n\nError: ' + err.message
      );
    }
  }

  async function createLocalPet(finalPetName) {
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
    // Always read current value from storage to avoid race conditions
    const currentCurrency = await getCurrency();
    const newCurrency = currentCurrency + 5;
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

    if (daysDiff > 1 && streak.currentStreak > 0) {
      // Streak is broken - check if user can buy a repair
      const currentCurrency = await getCurrency();
      const STREAK_REPAIR_PRICE = 100;

      if (currentCurrency >= STREAK_REPAIR_PRICE) {
        // User has enough coins - offer to purchase repair
        Alert.alert(
          '🔥 Streak Broken!',
          `You missed a day and lost your ${streak.currentStreak} day streak!\n\nWould you like to purchase a Streak Repair for ${STREAK_REPAIR_PRICE} coins to save it?`,
          [
            {
              text: 'No Thanks',
              style: 'cancel',
              onPress: async () => {
                // Break the streak
                const previousStreak = streak.currentStreak;
                streak.currentStreak = 0;
                streak.lastStreakBeforeBreak = previousStreak; // Save for potential future repair
                await saveStreakData(streak);
                setStreakData(streak);
              }
            },
            {
              text: `Buy Repair (${STREAK_REPAIR_PRICE} 💰)`,
              onPress: async () => {
                // Purchase and apply repair
                const newCurrency = currentCurrency - STREAK_REPAIR_PRICE;
                await saveCurrency(newCurrency);
                setCurrency(newCurrency);

                // Restore streak with a bandaid marker
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (!streak.bandaidDates) {
                  streak.bandaidDates = [];
                }
                if (!streak.bandaidDates.includes(yesterdayStr)) {
                  streak.bandaidDates.push(yesterdayStr);
                }

                streak.lastActivityDate = new Date().toISOString();
                await saveStreakData(streak);
                setStreakData(streak);

                showAlert('Streak Saved! 🩹', `You spent ${STREAK_REPAIR_PRICE} coins to repair your streak. Keep it going!`);
              }
            }
          ]
        );
      } else {
        // Not enough coins - just break the streak
        const previousStreak = streak.currentStreak;
        streak.currentStreak = 0;
        streak.lastStreakBeforeBreak = previousStreak;
        await saveStreakData(streak);
        setStreakData(streak);

        showAlert(
          'Streak Broken 💔',
          `You missed a day and lost your ${previousStreak} day streak!\n\nStreak Repairs cost ${STREAK_REPAIR_PRICE} coins and can be purchased in the Marketplace.`
        );
      }
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

  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            // Navigation will be handled automatically by root layout
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

    // Calculate activity dates (all historical activity days)
    const activityDaysInMonth = [];
    const bandaidDates = streakData.bandaidDates || [];
    const allActivityDates = streakData.activityDates || [];

    // Show all historical activity dates for this month
    allActivityDates.forEach(dateStr => {
      const activityDate = new Date(dateStr);
      if (activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear) {
        activityDaysInMonth.push(activityDate.getDate());
      }
    });

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
      const isActivityDay = activityDaysInMonth.includes(day);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isBandaidDay = bandaidDates.includes(dateStr);
      const isToday = day === currentDay;

      calendarDays.push(
        <View
          key={day}
          style={[
            styles.calendarDay,
            isActivityDay && styles.calendarStreakDay,
            isToday && styles.calendarToday,
          ]}
        >
          <Text style={[
            styles.calendarDayText,
            isActivityDay && styles.calendarStreakText,
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
      <LinearGradient colors={theme.gradient} style={styles.container}>
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

          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: '#FFA07A', marginTop: 10 }]}
            onPress={async () => {
              // Clear couple/pet data but keep auth
              await saveCoupleData(null);
              await savePetData(null);
              await saveStreakData({ currentStreak: 0, lastActivityDate: null, streakRepairs: 0 });
              setError(null);
              setCouple(null);
              setPet(null);
              setLoading(true);
              loadUserData();
            }}
          >
            <Text style={styles.retryButtonText}>Clear Data & Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: '#FF6347', marginTop: 10 }]}
            onPress={async () => {
              setError(null);
              await signOut();
            }}
          >
            <Text style={styles.retryButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <LinearGradient
        colors={theme.gradient}
        style={styles.loadingContainer}
      >
        <Animatable.View
          animation="fadeIn"
          duration={800}
          style={styles.loadingContent}
        >
          {/* App Icon/Logo */}
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            duration={2000}
            style={styles.loadingIconContainer}
          >
            <Image
              source={require('../../assets/spark_logo.png')}
              style={{ width: 250, height: 250 }}
              resizeMode="contain"
            />
          </Animatable.View>

          {/* App Title */}
          <Animatable.Text
            animation="fadeInUp"
            delay={200}
            style={[styles.loadingTitle, { marginTop: 20 }]}
          >
            Spark ⚡
          </Animatable.Text>

          {/* Loading Indicator */}
          <Animatable.View
            animation="fadeInUp"
            delay={400}
            style={styles.loadingIndicatorContainer}
          >
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Getting everything ready...</Text>
          </Animatable.View>

          {/* Subtle tagline */}
          <Animatable.Text
            animation="fadeIn"
            delay={600}
            style={styles.loadingTagline}
          >
            Building stronger connections together
          </Animatable.Text>
        </Animatable.View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
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
              <View style={styles.happinessLabelContainer}>
                <Text style={styles.happinessLabel}>Happiness</Text>
                <TouchableOpacity
                  onPress={() => setShowHappinessInfoModal(true)}
                  style={styles.happinessInfoIcon}
                >
                  <Ionicons name="information-circle-outline" size={18} color={theme.secondary} />
                </TouchableOpacity>
              </View>
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

            {pendingGames.length > 0 && (
              <View style={styles.miniGamesContainer}>
                <Text style={styles.miniGamesHeader}>Your Turn</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.miniGamesScroll}
                >
                  {pendingGames.map((game, index) => {
                    const gameInfo = {
                      tictactoe: { name: 'Tic Tac Toe', icon: '⭕', emoji: '❌' },
                      connectfour: { name: 'Connect Four', icon: '🔴', emoji: '🟡' },
                      reversi: { name: 'Reversi', icon: '⚫', emoji: '⚪' },
                      dotsandboxes: { name: 'Dots & Boxes', icon: '📦', emoji: '✏️' },
                      whiteboard: { name: 'Whiteboard', icon: '🎨', emoji: '✏️' },
                      checkers: { name: 'Checkers', icon: '⭕', emoji: '⚫' },
                      memorymatch: { name: 'Memory Match', icon: '🎮', emoji: '🎯' },
                      trivia: { name: 'Trivia', icon: '💭', emoji: '❤️' },
                      would_you_rather: { name: 'Would You Rather', icon: '🤔', emoji: '💭' },
                      whos_more_likely: { name: "Who's More Likely", icon: '👫', emoji: '❓' }
                    };
                    const info = gameInfo[game.game_type] || { name: game.game_type, icon: '🎮', emoji: '🎯' };

                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.miniGameCard}
                        onPress={() => {
                          switch (game.game_type) {
                            case 'tictactoe':
                              setShowTicTacToe(true);
                              break;
                            case 'connectfour':
                              setShowConnectFour(true);
                              break;
                            case 'reversi':
                              setShowReversi(true);
                              break;
                            case 'dotsandboxes':
                              setShowDotsAndBoxes(true);
                              break;
                            case 'whiteboard':
                              setShowWhiteboard(true);
                              break;
                            case 'checkers':
                              setShowCheckers(true);
                              break;
                            case 'memorymatch':
                              setShowMemoryMatch(true);
                              break;
                            case 'trivia':
                              setShowTrivia(true);
                              break;
                            case 'would_you_rather':
                              setShowWouldYouRather(true);
                              break;
                            case 'whos_more_likely':
                              setShowWhosMoreLikely(true);
                              break;
                          }
                        }}
                      >
                        <View style={styles.miniGameIcons}>
                          <Text style={styles.miniGameIcon}>{info.icon}</Text>
                          <Text style={styles.miniGameIconSecondary}>{info.emoji}</Text>
                        </View>
                        <Text style={styles.miniGameName}>{info.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {couple && !couple.auth_user2_id && (
              <View style={styles.coupleInfo}>
                <Text style={styles.coupleText}>
                  Invite Code: {couple.invite_code}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                  <TouchableOpacity
                    onPress={handleShareInviteCode}
                    style={[styles.copyButton, { backgroundColor: theme.primary, flex: 1 }]}
                  >
                    <Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={[styles.copyButtonText, { color: '#FFFFFF' }]}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setStringAsync(couple.invite_code);
                      showAlert('Copied!', 'Invite code copied to clipboard');
                    }}
                    style={[styles.copyButton, { flex: 1, backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Ionicons name="copy" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
          </View>
        </View>
      </Modal>

      {/* Pet Selection Modal */}
      <Modal visible={showPetSelectModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.petSelectionScrollContainer}
            contentContainerStyle={styles.petSelectionScrollContent}
          >
            <View style={styles.petSelectionModalContent}>
              <Text style={styles.modalTitle}>Choose Your Pet!</Text>
              <Text style={styles.modalSubtitle}>
                Pick a pet to take care of together 💕
              </Text>
              <Text style={styles.petSelectionNote}>
                Free starter pets available! ✨
              </Text>
              <Text style={styles.petSelectionNote}>
                Visit the Shop to unlock more pets with coins! 🛒
              </Text>

              <View style={styles.petGrid}>
                {Object.entries(PETS).map(([type, petData]) => {
                  // Free starter pets (parrot and penguin)
                  const freePets = ['parrot', 'penguin'];
                  const isFree = freePets.includes(type);
                  const isOwned = ownedPets.includes(type);
                  const isAvailable = isFree || isOwned;

                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.petCard,
                        !isAvailable && styles.petCardLocked
                      ]}
                      onPress={() => isAvailable ? handlePetTypeSelect(type) : null}
                      activeOpacity={isAvailable ? 0.7 : 1}
                      disabled={!isAvailable}
                    >
                      <View style={styles.petCardContent}>
                        {!isAvailable && (
                          <View style={styles.lockedOverlay}>
                            <Text style={styles.lockedIcon}>🔒</Text>
                          </View>
                        )}
                        {petData.image ? (
                          <Image
                            source={petData.image}
                            style={[
                              styles.petCardImage,
                              !isAvailable && styles.petCardImageLocked
                            ]}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={[
                            styles.petCardEmoji,
                            !isAvailable && styles.petCardEmojiLocked
                          ]}>
                            {petData.emoji}
                          </Text>
                        )}
                        <Text style={[
                          styles.petCardTitle,
                          !isAvailable && styles.petCardTitleLocked
                        ]}>
                          {petData.name}
                        </Text>
                        {isFree && (
                          <Text style={styles.freeBadge}>FREE</Text>
                        )}
                        {!isAvailable && (
                          <Text style={styles.visitShopText}>Visit Shop</Text>
                        )}
                        <Text
                          style={[
                            styles.petCardDescription,
                            !isAvailable && styles.petCardDescriptionLocked
                          ]}
                          numberOfLines={2}
                        >
                          {type === 'parrot' && 'Colorful & chatty'}
                          {type === 'penguin' && 'Adorable buddy'}
                          {type === 'dog' && 'Loyal & playful'}
                          {type === 'cat' && 'Independent pal'}
                          {type === 'bunny' && 'Cute hopper'}
                          {type === 'panda' && 'Bamboo lover'}
                          {type === 'fox' && 'Clever & spirited'}
                          {type === 'turtle' && 'Wise companion'}
                          {type === 'polar_bear' && 'Arctic friend'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
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
              placeholderTextColor={theme.border}
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
              placeholderTextColor={theme.border}
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
                  <View style={[styles.legendBox, { backgroundColor: theme.primary }]} />
                  <Text style={styles.legendText}>Activity Day</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: theme.backgroundSecondary }]}>
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
                style={[
                  styles.coinOptionCard,
                  !adLoaded && styles.coinOptionCardDisabled
                ]}
                onPress={async () => {
                  if (adLoading) {
                    showAlert('Loading...', 'The ad is still loading. Please wait a moment and try again.');
                  } else if (!adLoaded) {
                    showAlert('Ad Not Available', 'No ad is available right now. Please try again later.');
                  } else {
                    setShowCoinsModal(false);
                    const shown = await showAd();
                    if (!shown) {
                      showAlert('Error', 'Failed to show ad. Please try again.');
                    }
                  }
                }}
              >
                <Text style={styles.coinOptionIcon}>📺</Text>
                <Text style={styles.coinOptionTitle}>Watch Ad</Text>
                <Text style={styles.coinOptionReward}>
                  {adLoading ? 'Loading...' : adLoaded ? '+10 Coins' : 'Unavailable'}
                </Text>
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

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsOptions}>
              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => {
                  setShowSettingsModal(false);
                  setShowChangePetModal(true);
                }}
              >
                <Ionicons name="paw-outline" size={24} color={theme.primary} />
                <Text style={styles.settingsOptionText}>Change Pet</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => {
                  setShowSettingsModal(false);
                  setShowLeaveCoupleModal(true);
                }}
              >
                <Ionicons name="heart-dislike-outline" size={24} color={theme.primary} />
                <Text style={styles.settingsOptionText}>Leave Couple</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsOption, styles.dangerOption]}
                onPress={() => {
                  setShowSettingsModal(false);
                  setShowDeleteAccountModal(true);
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                <Text style={[styles.settingsOptionText, styles.dangerText]}>Delete Account</Text>
                <Ionicons name="chevron-forward" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal visible={showDeleteAccountModal} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Delete Account?</Text>
            <Text style={styles.deleteWarningText}>
              This action is permanent and cannot be undone. All your data will be deleted:
            </Text>
            <View style={styles.deleteWarningList}>
              <Text style={styles.deleteWarningItem}>• Your pet and progress</Text>
              <Text style={styles.deleteWarningItem}>• All photos and memories</Text>
              <Text style={styles.deleteWarningItem}>• Game history and scores</Text>
              <Text style={styles.deleteWarningItem}>• Your couple connection</Text>
            </View>

            <View style={styles.deleteButtonsRow}>
              <TouchableOpacity
                style={[styles.deleteActionButton, styles.cancelDeleteButton]}
                onPress={() => setShowDeleteAccountModal(false)}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteActionButton, styles.confirmDeleteButton]}
                onPress={deleteAccount}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Happiness Info Modal */}
      <Modal visible={showHappinessInfoModal} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Happiness Tips</Text>
              <TouchableOpacity onPress={() => setShowHappinessInfoModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Play games, share notes, and add memories to keep your pet happy!
              </Text>
              <Text style={styles.infoText}>
                ⚠️ Happiness decreases by 2 points every hour.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowHappinessInfoModal(false)}
            >
              <Text style={styles.buttonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      {/* Leave Couple Confirmation Modal */}
      <Modal visible={showLeaveCoupleModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Leave Couple</Text>
            <Text style={styles.warningText}>
              {couple?.auth_user1_id === userId
                ? '⚠️ Warning: As the couple creator, leaving will delete all couple data including the pet, activities, notes, and memories. This action cannot be undone!'
                : '⚠️ Are you sure you want to leave this couple? You can join a new one afterwards.'}
            </Text>

            <TouchableOpacity
              style={styles.confirmLeaveButton}
              onPress={leaveCouple}
            >
              <Text style={styles.confirmLeaveButtonText}>Yes, Leave Couple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowLeaveCoupleModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Pet Modal */}
      <Modal visible={showChangePetModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.scrollModalContent}>
            <Text style={styles.modalTitle}>Change Pet</Text>
            <Text style={styles.modalSubtitle}>
              Select a pet to switch to. Each pet keeps their own name and happiness!
            </Text>

            {allPets.length === 0 ? (
              <Text style={styles.noPetsText}>Loading your pets...</Text>
            ) : (
              <View style={styles.petsGrid}>
                {allPets.map((petItem) => {
                  const petData = PETS[petItem.pet_type];
                  const isCurrentPet = pet?.id === petItem.id;

                  return (
                    <TouchableOpacity
                      key={petItem.id}
                      style={[
                        styles.changePetCard,
                        isCurrentPet && styles.changePetCardActive
                      ]}
                      onPress={() => !isCurrentPet && switchToPet(petItem.id)}
                      disabled={isCurrentPet}
                    >
                      {petData.image ? (
                        <Image
                          source={petData.image}
                          style={styles.changePetImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.changePetEmoji}>{petData.emoji}</Text>
                      )}
                      <Text style={styles.changePetName}>{petItem.pet_name}</Text>
                      <Text style={styles.changePetType}>{petData.name}</Text>
                      <Text style={styles.changePetHappiness}>❤️ {petItem.happiness}%</Text>
                      {isCurrentPet && (
                        <View style={styles.equippedBadge}>
                          <Text style={styles.equippedBadgeText}>✓ Equipped</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowChangePetModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Game Modals */}
      <Modal visible={showTicTacToe} animationType="slide" transparent>
        <TicTacToeGame
          couple={couple}
          userId={userId}
          onClose={() => setShowTicTacToe(false)}
          onTurnComplete={async () => {
            const games = await getMyPendingTurns(couple.id, userId);
            setPendingGames(games || []);
          }}
          onComplete={async (won) => {
            setShowTicTacToe(false);
            if (won) {
              showAlert('You won!', 'Great job! Your pet gained +5 happiness');
              await feedPet(5);
            }
          }}
        />
      </Modal>

      <Modal visible={showConnectFour} animationType="slide" transparent>
        <ConnectFourGame
          couple={couple}
          userId={userId}
          onClose={() => setShowConnectFour(false)}
          onTurnComplete={async () => {
            const games = await getMyPendingTurns(couple.id, userId);
            setPendingGames(games || []);
          }}
          onComplete={async (won) => {
            setShowConnectFour(false);
            if (won) {
              showAlert('You won!', 'Great job! Your pet gained +5 happiness');
              await feedPet(5);
            }
          }}
        />
      </Modal>

      <Modal visible={showReversi} animationType="slide" transparent>
        <ReversiGame
          couple={couple}
          userId={userId}
          onClose={() => setShowReversi(false)}
          onTurnComplete={async () => {
            const games = await getMyPendingTurns(couple.id, userId);
            setPendingGames(games || []);
          }}
          onComplete={async (won) => {
            setShowReversi(false);
            if (won) {
              showAlert('You won!', 'Great job! Your pet gained +5 happiness');
              await feedPet(5);
            }
          }}
        />
      </Modal>

      <Modal visible={showDotsAndBoxes} animationType="slide" transparent>
        <DotsAndBoxesGame
          couple={couple}
          userId={userId}
          onClose={() => setShowDotsAndBoxes(false)}
          onTurnComplete={async () => {
            const games = await getMyPendingTurns(couple.id, userId);
            setPendingGames(games || []);
          }}
          onComplete={async (won) => {
            setShowDotsAndBoxes(false);
            if (won) {
              showAlert('You won!', 'Great job! Your pet gained +5 happiness');
              await feedPet(5);
            }
          }}
        />
      </Modal>

      <Modal visible={showWhiteboard} animationType="slide" transparent>
        <WhiteboardGame
          couple={couple}
          userId={userId}
          onClose={() => setShowWhiteboard(false)}
          onComplete={async () => {
            setShowWhiteboard(false);
            showAlert('Saved!', 'Your drawing has been saved');
            await feedPet(5);
          }}
        />
      </Modal>

      <Modal visible={showCheckers} animationType="slide" transparent>
        <CheckersGame
          couple={couple}
          userId={userId}
          onClose={() => setShowCheckers(false)}
          onTurnComplete={async () => {
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            setPendingGames(updatedTurns);
          }}
          onComplete={async (isWinner) => {
            setShowCheckers(false);
            await feedPet(5);
          }}
        />
      </Modal>

      <Modal visible={showMemoryMatch} animationType="slide" transparent>
        <MemoryMatchGame
          couple={couple}
          userId={userId}
          onClose={() => setShowMemoryMatch(false)}
          onTurnComplete={async () => {
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            setPendingGames(updatedTurns);
          }}
          onComplete={async (isWinner) => {
            setShowMemoryMatch(false);
            await feedPet(5);
          }}
        />
      </Modal>

      {/* Conversation Games */}
      <Modal visible={showTrivia} animationType="slide">
        <TriviaGame
          couple={couple}
          userId={userId}
          onClose={() => setShowTrivia(false)}
          onComplete={async () => {
            setShowTrivia(false);
            await feedPet(5);
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            setPendingGames(updatedTurns);
          }}
        />
      </Modal>

      <Modal visible={showWouldYouRather} animationType="slide">
        <WouldYouRatherGame
          couple={couple}
          userId={userId}
          onClose={() => setShowWouldYouRather(false)}
          onComplete={async () => {
            setShowWouldYouRather(false);
            await feedPet(5);
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            setPendingGames(updatedTurns);
          }}
        />
      </Modal>

      <Modal visible={showWhosMoreLikely} animationType="slide">
        <WhosMoreLikelyGame
          couple={couple}
          userId={userId}
          onClose={() => setShowWhosMoreLikely(false)}
          onComplete={async () => {
            setShowWhosMoreLikely(false);
            await feedPet(5);
            const updatedTurns = await getMyPendingTurns(couple.id, userId);
            setPendingGames(updatedTurns);
          }}
        />
      </Modal>
    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingIconContainer: {
    marginBottom: 30,
    backgroundColor: theme.card,
    borderRadius: 80,
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  loadingIcon: {
    fontSize: 80,
  },
  loadingTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.primary,
    marginBottom: 40,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  loadingIndicatorContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.secondary,
    fontWeight: '600',
    marginTop: 12,
  },
  loadingTagline: {
    fontSize: 14,
    color: '#999999',
    marginTop: 40,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.7,
  },
  loadingSubtext: {
    fontSize: 14,
    color: theme.secondary,
    marginTop: 10,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: theme.secondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: theme.primary,
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
    backgroundColor: theme.card,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    zIndex: 10,
  },
  currencyBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
  },
  streakBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: theme.card,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
  },
  repairButton: {
    marginLeft: 8,
    backgroundColor: theme.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  repairButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.primary,
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
  happinessLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  happinessLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
  },
  happinessInfoIcon: {
    marginLeft: 8,
    padding: 2,
  },
  happinessBarContainer: {
    height: 30,
    backgroundColor: theme.card,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.border,
  },
  happinessBar: {
    height: '100%',
    backgroundColor: theme.primary,
  },
  happinessText: {
    fontSize: 16,
    color: theme.secondary,
    textAlign: 'center',
    marginTop: 5,
  },
  feedButton: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 8,
    shadowColor: theme.primary,
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
  miniGamesContainer: {
    marginBottom: 12,
    width: '100%',
  },
  miniGamesHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.secondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  miniGamesScroll: {
    paddingHorizontal: 2,
  },
  miniGameCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    minWidth: 90,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  miniGameIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  miniGameIcon: {
    fontSize: 24,
    marginRight: 2,
  },
  miniGameIconSecondary: {
    fontSize: 20,
  },
  miniGameName: {
    fontSize: 11,
    color: theme.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: theme.card,
    padding: 15,
    borderRadius: 15,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  infoText: {
    fontSize: 14,
    color: theme.secondary,
    marginBottom: 5,
  },
  coupleInfo: {
    backgroundColor: theme.card,
    padding: 15,
    borderRadius: 15,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    width: '100%',
    alignItems: 'center',
  },
  coupleText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  copyButton: {
    backgroundColor: theme.backgroundSecondary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonText: {
    color: theme.primary,
    fontWeight: 'bold',
  },
  deviceIdText: {
    fontSize: 10,
    color: theme.secondary,
    marginTop: 5,
  },
  deviceIdInfo: {
    fontSize: 10,
    color: theme.secondary,
    marginTop: 15,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 3,
    marginBottom: 0,
  },
  resetText: {
    color: theme.secondary,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: theme.primary,
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
    color: theme.border,
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: theme.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: theme.border,
    textAlign: 'center',
  },
  petSelectionScrollContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  petSelectionScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  petSelectionModalContent: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 30,
    width: '95%',
    maxWidth: 500,
  },
  petSelectionNote: {
    fontSize: 14,
    color: theme.secondary,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  petGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  petCard: {
    width: '48%',
    marginBottom: 15,
  },
  petCardContent: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.backgroundSecondary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 180,
  },
  petCardImage: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  petCardEmoji: {
    fontSize: 70,
    marginBottom: 10,
  },
  petCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  petCardDescription: {
    fontSize: 11,
    color: theme.secondary,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 3,
  },
  petCardLocked: {
    opacity: 0.6,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  lockedIcon: {
    fontSize: 24,
  },
  petCardImageLocked: {
    opacity: 0.4,
  },
  petCardEmojiLocked: {
    opacity: 0.4,
  },
  petCardTitleLocked: {
    color: '#999',
  },
  petCardDescriptionLocked: {
    color: '#BBB',
  },
  freeBadge: {
    backgroundColor: '#32CD32',
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  visitShopText: {
    backgroundColor: theme.border,
    color: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 5,
  },
  petNameDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.primary,
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
    backgroundColor: theme.background,
    borderRadius: 15,
    padding: 15,
    fontSize: 18,
    borderWidth: 2,
    borderColor: theme.border,
    width: '100%',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: theme.primary,
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
    backgroundColor: theme.border,
  },
  confirmButton: {
    backgroundColor: theme.primary,
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
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: theme.secondary,
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24,
  },
  alertButton: {
    backgroundColor: theme.primary,
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
    color: theme.primary,
    fontWeight: 'bold',
  },
  calendarModalContent: {
    backgroundColor: theme.card,
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
    backgroundColor: theme.background,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  statCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 11,
    color: theme.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  calendarContainer: {
    minHeight: 200,
    backgroundColor: theme.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarInfo: {
    fontSize: 14,
    color: theme.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  closeModalButton: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  coinsModalContent: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
  },
  coinBalanceDisplay: {
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: 30,
    borderRadius: 20,
    marginBottom: 25,
    borderWidth: 3,
    borderColor: theme.backgroundSecondary,
  },
  coinBalanceText: {
    fontSize: 60,
    marginBottom: 10,
  },
  coinBalanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  coinBalanceLabel: {
    fontSize: 18,
    color: theme.secondary,
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
    backgroundColor: theme.background,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  coinOptionCardDisabled: {
    opacity: 0.5,
  },
  coinOptionIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  coinOptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  coinOptionReward: {
    fontSize: 12,
    color: theme.secondary,
  },
  calendarScroll: {
    maxHeight: 400,
  },
  calendar: {
    backgroundColor: theme.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  calendarMonthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
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
    color: theme.secondary,
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
    backgroundColor: theme.primary,
    borderRadius: 8,
  },
  calendarToday: {
    borderWidth: 2,
    borderColor: theme.secondary,
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: theme.text,
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
    backgroundColor: theme.background,
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
    color: theme.secondary,
    fontWeight: '500',
  },
  achievementsSection: {
    marginTop: 20,
  },
  achievementsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  achievementLocked: {
    backgroundColor: theme.backgroundSecondary,
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
    color: theme.primary,
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: theme.secondary,
  },
  achievementTextLocked: {
    color: theme.textSecondary,
  },
  achievementUnlocked: {
    fontSize: 24,
    color: '#32CD32',
    fontWeight: 'bold',
  },
  profileInfo: {
    marginVertical: 20,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundSecondary,
  },
  profileLabel: {
    fontSize: 16,
    color: theme.secondary,
    fontWeight: '600',
  },
  profileValue: {
    fontSize: 16,
    color: theme.text,
    maxWidth: '60%',
  },
  profileDivider: {
    height: 1,
    backgroundColor: theme.backgroundSecondary,
    marginVertical: 15,
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 10,
  },
  copyCodeButton: {
    backgroundColor: theme.border,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  copyCodeButtonText: {
    color: theme.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  leaveCoupleButton: {
    backgroundColor: '#FFA07A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  leaveCoupleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  warningText: {
    fontSize: 14,
    color: '#FF6347',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  confirmLeaveButton: {
    backgroundColor: '#FF6347',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmLeaveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  changePetButton: {
    backgroundColor: theme.secondary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  changePetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollModalContent: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 60,
    maxHeight: '85%',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  noPetsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginVertical: 30,
  },
  petsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  changePetCard: {
    width: '48%',
    backgroundColor: theme.background,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    alignItems: 'center',
  },
  changePetCardActive: {
    borderColor: theme.primary,
    backgroundColor: theme.backgroundSecondary,
  },
  changePetImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  changePetEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  changePetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 5,
  },
  changePetType: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  changePetHappiness: {
    fontSize: 14,
    color: theme.secondary,
    textAlign: 'center',
  },
  equippedBadge: {
    backgroundColor: '#32CD32',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 10,
  },
  equippedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 10,
    backgroundColor: theme.card,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsOptions: {
    marginVertical: 20,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingsOptionText: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    marginLeft: 15,
  },
  dangerOption: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#FF3B30',
  },
  warningIcon: {
    fontSize: 50,
    textAlign: 'center',
    marginBottom: 10,
  },
  deleteWarningText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginVertical: 15,
  },
  deleteWarningList: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 20,
  },
  deleteWarningItem: {
    fontSize: 14,
    color: theme.textSecondary,
    marginVertical: 5,
  },
  deleteButtonsRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
  },
  deleteActionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  cancelDeleteButton: {
    backgroundColor: theme.backgroundSecondary,
  },
  cancelDeleteText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    backgroundColor: '#FF3B30',
  },
  confirmDeleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
