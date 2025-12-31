import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

// Get authenticated user ID from Supabase
export async function getUserId() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return user?.id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Get or create couple data
export async function getCoupleData() {
  try {
    const data = await AsyncStorage.getItem('couple_data');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting couple data:', error);
    return null;
  }
}

// Save couple data
export async function saveCoupleData(coupleData) {
  try {
    if (coupleData === null || coupleData === undefined) {
      await AsyncStorage.removeItem('couple_data');
    } else {
      await AsyncStorage.setItem('couple_data', JSON.stringify(coupleData));
    }
  } catch (error) {
    console.error('Error saving couple data:', error);
  }
}

// Get pet data
export async function getPetData() {
  try {
    const data = await AsyncStorage.getItem('pet_data');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting pet data:', error);
    return null;
  }
}

// Save pet data
export async function savePetData(petData) {
  try {
    if (petData === null || petData === undefined) {
      await AsyncStorage.removeItem('pet_data');
    } else {
      await AsyncStorage.setItem('pet_data', JSON.stringify(petData));
    }
  } catch (error) {
    console.error('Error saving pet data:', error);
  }
}

// Get currency
export async function getCurrency() {
  try {
    const currency = await AsyncStorage.getItem('currency');
    return currency ? parseInt(currency) : 100; // Start with 100 coins
  } catch (error) {
    console.error('Error getting currency:', error);
    return 100;
  }
}

// Save currency
export async function saveCurrency(amount) {
  try {
    await AsyncStorage.setItem('currency', amount.toString());
  } catch (error) {
    console.error('Error saving currency:', error);
  }
}

// Get owned pets
export async function getOwnedPets() {
  try {
    const pets = await AsyncStorage.getItem('owned_pets');
    return pets ? JSON.parse(pets) : [];
  } catch (error) {
    console.error('Error getting owned pets:', error);
    return [];
  }
}

// Save owned pets
export async function saveOwnedPets(pets) {
  try {
    await AsyncStorage.setItem('owned_pets', JSON.stringify(pets));
  } catch (error) {
    console.error('Error saving owned pets:', error);
  }
}

// Get streak data
export async function getStreakData() {
  try {
    const coupleData = await getCoupleData();

    if (coupleData && coupleData.id) {
      // Return streak data from couple record
      return {
        currentStreak: coupleData.current_streak || 0,
        lastActivityDate: coupleData.last_activity_date || null,
        streakRepairs: 0, // Not used in Supabase version
      };
    }

    // Fallback to local storage if no couple
    const data = await AsyncStorage.getItem('streak_data');
    if (data) {
      return JSON.parse(data);
    }

    // Default streak data
    return {
      currentStreak: 0,
      lastActivityDate: null,
      streakRepairs: 0,
    };
  } catch (error) {
    console.error('Error getting streak data:', error);
    return { currentStreak: 0, lastActivityDate: null, streakRepairs: 0 };
  }
}

// Save streak data
export async function saveStreakData(streakData) {
  try {
    const coupleData = await getCoupleData();

    if (coupleData && coupleData.id && isSupabaseConfigured()) {
      // Save to Supabase couples table
      const { error } = await supabase
        .from('couples')
        .update({
          current_streak: streakData.currentStreak,
          last_activity_date: streakData.lastActivityDate,
        })
        .eq('id', coupleData.id);

      if (error) {
        console.error('Error saving streak to Supabase:', error);
      }

      // Update local cache
      const updatedCouple = {
        ...coupleData,
        current_streak: streakData.currentStreak,
        last_activity_date: streakData.lastActivityDate,
      };
      await saveCoupleData(updatedCouple);
    } else {
      // Fallback to local storage
      await AsyncStorage.setItem('streak_data', JSON.stringify(streakData));
    }
  } catch (error) {
    console.error('Error saving streak data:', error);
  }
}

// Get all pets data (individual stats for each pet type)
export async function getAllPetsData() {
  try {
    const data = await AsyncStorage.getItem('all_pets_data');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting all pets data:', error);
    return {};
  }
}

// Save all pets data
export async function saveAllPetsData(allPetsData) {
  try {
    await AsyncStorage.setItem('all_pets_data', JSON.stringify(allPetsData));
  } catch (error) {
    console.error('Error saving all pets data:', error);
  }
}

// Get data for a specific pet type
export async function getSpecificPetData(petType) {
  try {
    const allPets = await getAllPetsData();
    return allPets[petType] || null;
  } catch (error) {
    console.error('Error getting specific pet data:', error);
    return null;
  }
}

// Save data for a specific pet type
export async function saveSpecificPetData(petType, petData) {
  try {
    const allPets = await getAllPetsData();
    allPets[petType] = petData;
    await saveAllPetsData(allPets);
  } catch (error) {
    console.error('Error saving specific pet data:', error);
  }
}

// Get current active pet type
export async function getCurrentPetType() {
  try {
    const petType = await AsyncStorage.getItem('current_pet_type');
    return petType || null;
  } catch (error) {
    console.error('Error getting current pet type:', error);
    return null;
  }
}

// Save current active pet type
export async function saveCurrentPetType(petType) {
  try {
    await AsyncStorage.setItem('current_pet_type', petType);
  } catch (error) {
    console.error('Error saving current pet type:', error);
  }
}

// Clear all data (for testing)
export async function clearAllData() {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}
