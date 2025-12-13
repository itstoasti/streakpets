import { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { getCurrency, saveCurrency, getOwnedPets, saveOwnedPets, getPetData, savePetData, getStreakData, saveStreakData, getCurrentPetType, saveCurrentPetType, getSpecificPetData, saveSpecificPetData } from '../../lib/storage';

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
  const [currency, setCurrency] = useState(0);
  const [ownedPets, setOwnedPets] = useState([]);
  const [currentPet, setCurrentPet] = useState(null);
  const [streakRepairs, setStreakRepairs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    loadData();
  }, []);

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
    setCurrency(userCurrency);
    setOwnedPets(pets);
    setCurrentPet(activePet);
    setStreakRepairs(streakData.streakRepairs || 0);
    setLoading(false);
  }

  async function purchasePet(petType) {
    const pet = SHOP_PETS[petType];

    if (ownedPets.includes(petType)) {
      Alert.alert('Already Owned', 'You already own this pet!');
      return;
    }

    if (currency < pet.price) {
      Alert.alert('Not Enough Coins', `You need ${pet.price} coins but only have ${currency}`);
      return;
    }

    // Deduct currency
    const newCurrency = currency - pet.price;
    await saveCurrency(newCurrency);
    setCurrency(newCurrency);

    // Add to owned pets
    const newOwnedPets = [...ownedPets, petType];
    await saveOwnedPets(newOwnedPets);
    setOwnedPets(newOwnedPets);

    showAlert('Success!', `You purchased ${pet.name}! Tap Equip to use this pet.`);
  }

  async function equipPet(petType) {
    if (!currentPet) return;

    // Save current pet's data before switching
    if (currentPet.pet_type) {
      await saveSpecificPetData(currentPet.pet_type, {
        name: currentPet.pet_name,
        happiness: currentPet.happiness,
        last_decay: currentPet.last_decay,
      });
    }

    // Load the new pet's data or initialize with defaults
    let newPetData = await getSpecificPetData(petType);
    if (!newPetData) {
      newPetData = {
        name: SHOP_PETS[petType].name,
        happiness: 50,
        last_decay: new Date().toISOString(),
      };
      await saveSpecificPetData(petType, newPetData);
    }

    // Update the current pet
    const updatedPet = {
      ...currentPet,
      pet_type: petType,
      pet_name: newPetData.name,
      happiness: newPetData.happiness,
      last_decay: newPetData.last_decay,
    };

    await savePetData(updatedPet);
    await saveCurrentPetType(petType);
    setCurrentPet(updatedPet);
    showAlert('Success!', `Equipped ${newPetData.name}!`);
  }

  async function purchaseStreakRepair() {
    const price = 100;

    if (currency < price) {
      Alert.alert('Not Enough Coins', `You need ${price} coins but only have ${currency}`);
      return;
    }

    // Deduct currency
    const newCurrency = currency - price;
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
    <LinearGradient colors={['#FFE5EC', '#FFF0F5']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.currencyText}>💰 Coins: {currency}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Pet Marketplace</Text>
        <Text style={styles.subtitle}>Purchase new pets to care for!</Text>

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

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>💡 How to Earn Coins</Text>
          <Text style={styles.tipText}>• Feed your pet: +5 coins</Text>
          <Text style={styles.tipText}>• Play games (coming soon)</Text>
          <Text style={styles.tipText}>• Add photos (coming soon)</Text>
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
  header: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#FFE5EC',
    alignItems: 'center',
  },
  currencyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF1493',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#FF69B4',
    textAlign: 'center',
    marginBottom: 20,
  },
  specialItemCard: {
    backgroundColor: 'white',
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
    color: '#FF1493',
    marginBottom: 3,
  },
  specialItemDescription: {
    fontSize: 12,
    color: '#FF69B4',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 15,
  },
  petsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  petCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE5EC',
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
    color: '#FF1493',
    marginBottom: 5,
  },
  petDescription: {
    fontSize: 12,
    color: '#FF69B4',
    textAlign: 'center',
    marginBottom: 10,
  },
  buyButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 5,
  },
  buyButtonDisabled: {
    backgroundColor: '#FFB6D9',
  },
  buyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  equipButton: {
    backgroundColor: '#FF69B4',
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
  tipBox: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#FFE5EC',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#FF69B4',
    marginBottom: 5,
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
});
