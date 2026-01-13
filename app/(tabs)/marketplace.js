import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { getCurrency, saveCurrency, getOwnedPets, saveOwnedPets, getPetData, savePetData, getStreakData, saveStreakData, getCurrentPetType, saveCurrentPetType, getSpecificPetData, saveSpecificPetData, getCoupleData } from '../../lib/storage';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../lib/themeContext';
import { useRewardedAd } from '../../lib/rewardedAds';

// Available pets in the shop with prices
const SHOP_PETS = {
  parrot: {
    name: 'Parrot',
    image: require('../../assets/parrot.png'),
    price: 0, // Free starter pet
    description: 'Colorful and chatty'
  },
  penguin: {
    name: 'Penguin',
    image: require('../../assets/penguin.png'),
    price: 0, // Free starter pet
    description: 'Waddles with joy'
  },
  dog: {
    name: 'Dog',
    image: require('../../assets/dog.png'),
    price: 150,
    description: 'A loyal companion'
  },
  cat: {
    name: 'Cat',
    image: require('../../assets/cat.png'),
    price: 150,
    description: 'Independent and playful'
  },
  bunny: {
    name: 'Bunny',
    image: require('../../assets/bunny.png'),
    price: 200,
    description: 'Hops around happily'
  },
  panda: {
    name: 'Panda',
    image: require('../../assets/panda.png'),
    price: 300,
    description: 'Rare and adorable'
  },
  fox: {
    name: 'Fox',
    image: require('../../assets/fox.png'),
    price: 250,
    description: 'Clever and quick'
  },
  turtle: {
    name: 'Turtle',
    image: require('../../assets/turtle.png'),
    price: 180,
    description: 'Slow and steady'
  },
  polar_bear: {
    name: 'Polar Bear',
    image: require('../../assets/polar_bear.png'),
    price: 350,
    description: 'Cool and cuddly'
  },
};

export default function MarketplaceScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [currency, setCurrency] = useState(0);
  const [ownedPets, setOwnedPets] = useState([]);
  const [currentPet, setCurrentPet] = useState(null);
  const [streakRepairs, setStreakRepairs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });
  const [showCoinInfoModal, setShowCoinInfoModal] = useState(false);
  const [couple, setCouple] = useState(null);
  const isFocused = useIsFocused();

  // Rewarded ad hook - earn coins for watching ads
  const handleAdReward = async (rewardAmount, silent) => {
    // Award coins
    const coinsEarned = 10;
    // Always read current value from storage to avoid race conditions
    const currentCurrency = await getCurrency();
    const newCurrency = currentCurrency + coinsEarned;
    await saveCurrency(newCurrency);
    setCurrency(newCurrency);
    // Only show alert if not silent (silent is true for non-active tabs to prevent duplicate popups)
    if (!silent) {
      showAlert('Coins Earned! 💰', `You earned ${coinsEarned} coins for watching the ad!`);
    }
  };
  const { loaded: adLoaded, loading: adLoading, showAd } = useRewardedAd(handleAdReward);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  function hideAlert() {
    setCustomAlert({ visible: false, title: '', message: '' });
  }

  async function loadData() {
    const userCurrency = await getCurrency();
    const pets = await getOwnedPets();
    const activePet = await getPetData();
    const streakData = await getStreakData();
    const coupleData = await getCoupleData();
    setCurrency(userCurrency);
    setOwnedPets(pets);
    setCurrentPet(activePet);
    setStreakRepairs(streakData.streakRepairs || 0);
    setCouple(coupleData);
    setLoading(false);
  }

  async function purchasePet(petType) {
    const pet = SHOP_PETS[petType];

    if (ownedPets.includes(petType)) {
      Alert.alert('Already Owned', 'You already own this pet!');
      return;
    }

    // Always read current value from storage to avoid race conditions
    const currentCurrency = await getCurrency();
    if (currentCurrency < pet.price) {
      Alert.alert('Not Enough Coins', `You need ${pet.price} coins but only have ${currentCurrency}`);
      return;
    }

    // Deduct currency
    const newCurrency = currentCurrency - pet.price;
    await saveCurrency(newCurrency);
    setCurrency(newCurrency);

    // Add to owned pets
    const newOwnedPets = [...ownedPets, petType];
    await saveOwnedPets(newOwnedPets);
    setOwnedPets(newOwnedPets);

    showAlert('Success!', `You purchased ${pet.name}! Tap Equip to use this pet.`);
  }

  async function equipPet(petType) {
    if (!couple || !isSupabaseConfigured()) {
      showAlert('Error', 'Database not configured. Cannot equip pet.');
      return;
    }

    console.log('🔄 Equipping pet type:', petType);

    try {
      // Check if a pet of this type already exists for this couple
      const { data: existingPets, error: searchError } = await supabase
        .from('pets')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('pet_type', petType);

      if (searchError) {
        console.error('Error searching for existing pet:', searchError);
        showAlert('Error', 'Failed to search for pet. Please try again.');
        return;
      }

      if (existingPets && existingPets.length > 0) {
        // Pet of this type already exists, switch to it
        const existingPet = existingPets[0];
        console.log('✅ Found existing pet:', existingPet.pet_name, '- switching to it');

        // Unequip all pets
        await supabase
          .from('pets')
          .update({ is_equipped: false })
          .eq('couple_id', couple.id);

        // Equip this pet
        const { data: equippedPet, error: equipError } = await supabase
          .from('pets')
          .update({ is_equipped: true })
          .eq('id', existingPet.id)
          .select()
          .single();

        if (equipError) {
          console.error('Error equipping pet:', equipError);
          showAlert('Error', 'Failed to equip pet. Please try again.');
          return;
        }

        // Update local state
        setCurrentPet(equippedPet);
        await savePetData(equippedPet);
        showAlert('Pet Equipped!', `Switched to ${equippedPet.pet_name}!`);
      } else {
        // No pet of this type exists, create a new one
        console.log('📝 Creating new pet of type:', petType);

        // Unequip all existing pets
        await supabase
          .from('pets')
          .update({ is_equipped: false })
          .eq('couple_id', couple.id);

        // Create new pet
        const { data: newPet, error: createError } = await supabase
          .from('pets')
          .insert({
            couple_id: couple.id,
            pet_type: petType,
            pet_name: SHOP_PETS[petType].name,
            happiness: 50,
            last_decay: new Date().toISOString(),
            is_equipped: true,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating pet:', createError);
          showAlert('Error', 'Failed to create pet. Please try again.');
          return;
        }

        console.log('✅ Created new pet:', newPet.pet_name, 'ID:', newPet.id);

        // Update local state
        setCurrentPet(newPet);
        await savePetData(newPet);
        showAlert('Pet Equipped!', `${newPet.pet_name} is now your active pet!`);
      }
    } catch (err) {
      console.error('Unexpected error equipping pet:', err);
      showAlert('Error', 'An unexpected error occurred.');
    }
  }

  async function purchaseStreakRepair() {
    const price = 100;

    // Always read current value from storage to avoid race conditions
    const currentCurrency = await getCurrency();
    if (currentCurrency < price) {
      Alert.alert('Not Enough Coins', `You need ${price} coins but only have ${currentCurrency}`);
      return;
    }

    // Deduct currency
    const newCurrency = currentCurrency - price;
    await saveCurrency(newCurrency);
    setCurrency(newCurrency);

    // Add streak repair
    const streakData = await getStreakData();
    streakData.streakRepairs = (streakData.streakRepairs || 0) + 1;
    await saveStreakData(streakData);
    setStreakRepairs(streakData.streakRepairs);

    showAlert('Success!', 'Purchased 1 Streak Repair! Use it on the Pet tab to fix a broken streak.');
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.currencyContainer}>
          <Text style={styles.currencyText}>💰 Coins: {currency}</Text>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowCoinInfoModal(true)}
          >
            <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Pet Marketplace</Text>
        <Text style={styles.subtitle}>Purchase new pets to care for!</Text>

        {/* Watch Ad for Coins Section */}
        <View style={[styles.specialItemCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary, borderWidth: 2 }]}>
          <Text style={styles.specialItemEmoji}>📺</Text>
          <View style={styles.specialItemInfo}>
            <Text style={styles.specialItemName}>Watch Ad for Coins</Text>
            <Text style={styles.specialItemDescription}>
              {adLoading ? 'Loading ad...' : adLoaded ? 'Watch an ad and earn 15 coins!' : 'Ad not ready yet...'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.buyButton,
              { backgroundColor: theme.primary },
              !adLoaded && styles.buyButtonDisabled
            ]}
            onPress={async () => {
              const success = await showAd();
              if (!success) {
                showAlert('Ad Not Ready', 'Please wait a moment and try again.');
              }
            }}
            disabled={!adLoaded}
          >
            <Ionicons name="play-circle" size={20} color="#FFFFFF" />
            <Text style={[styles.buyButtonText, { marginLeft: 5 }]}>
              {adLoading ? 'Loading...' : 'Watch'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Streak Repair Section */}
        <View style={styles.specialItemCard}>
          <Text style={styles.specialItemEmoji}>🩹</Text>
          <View style={styles.specialItemInfo}>
            <Text style={styles.specialItemName}>Streak Repair</Text>
            <Text style={styles.specialItemDescription}>
              Fix a broken streak! You have {streakRepairs}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.buyButton,
              currency < 100 && styles.buyButtonDisabled
            ]}
            onPress={purchaseStreakRepair}
            disabled={currency < 100}
          >
            <Text style={styles.buyButtonText}>100 💰</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Pets</Text>

        <View style={styles.petsGrid}>
          {Object.entries(SHOP_PETS).map(([type, pet]) => {
            const owned = ownedPets.includes(type);
            const canAfford = currency >= pet.price;
            const isEquipped = currentPet && currentPet.pet_type === type;

            return (
              <View key={type} style={styles.petCard}>
                {pet.image ? (
                  <Image
                    source={pet.image}
                    style={styles.petImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.petEmoji}>{pet.emoji}</Text>
                )}

                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petDescription}>{pet.description}</Text>

                {owned ? (
                  isEquipped ? (
                    <View style={styles.equippedBadge}>
                      <Text style={styles.equippedText}>✓ EQUIPPED</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.equipButton}
                      onPress={() => equipPet(type)}
                    >
                      <Text style={styles.equipButtonText}>EQUIP</Text>
                    </TouchableOpacity>
                  )
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.buyButton,
                      !canAfford && styles.buyButtonDisabled
                    ]}
                    onPress={() => purchasePet(type)}
                    disabled={!canAfford}
                  >
                    <Text style={styles.buyButtonText}>
                      {pet.price === 0 ? 'FREE' : `${pet.price} 💰`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>


      </ScrollView>

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

      {/* Coin Info Modal */}
      <Modal visible={showCoinInfoModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How to Earn Coins 💰</Text>
              <TouchableOpacity onPress={() => setShowCoinInfoModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🍎</Text>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Feed your pet</Text>
                <Text style={styles.infoValue}>+5 coins</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🏆</Text>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Win mini-games</Text>
                <Text style={styles.infoValue}>+5 coins</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💬</Text>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Play conversation games</Text>
                <Text style={styles.infoValue}>+5 coins</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🔥</Text>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Maintain streak</Text>
                <Text style={styles.infoValue}>Daily rewards!</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowCoinInfoModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  loadingText: {
    fontSize: 18,
    color: theme.primary,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: theme.card,
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: theme.backgroundSecondary,
    alignItems: 'center',
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
  },
  infoButton: {
    padding: 2,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  specialItemCard: {
    backgroundColor: theme.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
  },
  specialItemEmoji: {
    fontSize: 50,
    marginRight: 15,
  },
  specialItemInfo: {
    flex: 1,
  },
  specialItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 3,
  },
  specialItemDescription: {
    fontSize: 12,
    color: theme.secondary,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 15,
  },
  petsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  petCard: {
    width: '48%',
    backgroundColor: theme.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
  },
  petImage: {
    width: 195,
    height: 195,
    marginBottom: 10,
  },
  petEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 5,
  },
  petDescription: {
    fontSize: 12,
    color: theme.secondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  buyButton: {
    backgroundColor: theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 5,
  },
  buyButtonDisabled: {
    backgroundColor: theme.border,
  },
  buyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  equipButton: {
    backgroundColor: theme.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 5,
  },
  equipButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  equippedBadge: {
    backgroundColor: '#90EE90',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 5,
  },
  equippedText: {
    color: '#228B22',
    fontWeight: 'bold',
    fontSize: 12,
  },
  equippedText: {
    color: '#228B22',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
    backgroundColor: theme.background,
    padding: 12,
    borderRadius: 12,
  },
  infoIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
  },
  infoValue: {
    fontSize: 14,
    color: theme.success,
    fontWeight: '600',
  },
  closeModalButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
});
