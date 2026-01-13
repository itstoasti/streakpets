import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../../lib/themeContext';
import * as FileSystem from 'expo-file-system/legacy';

export default function AlbumScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [memories, setMemories] = useState([]);
  const [couple, setCouple] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemoryDescription, setNewMemoryDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    // Only load data on initial mount, not every focus
    // Realtime subscription handles updates
    if (user && !initialLoadDone) {
      loadData();
      setInitialLoadDone(true);
    }
  }, [user, initialLoadDone]);

  useEffect(() => {
    if (couple) {
      return subscribeToMemories();
    }
  }, [couple]);

  function showAlert(title, message) {
    setCustomAlert({ visible: true, title, message });
  }

  async function loadData() {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`auth_user1_id.eq.${user.id},auth_user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (coupleData && coupleData.length > 0) {
        setCouple(coupleData[0]);
        await loadMemories(coupleData[0].id);
      }

      setLoading(false);
    } catch (error) {
      console.log('Error loading data:', error.message);
      setLoading(false);
    }
  }

  async function loadMemories(coupleId) {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Get signed URLs for each memory image
      const memoriesWithUrls = await Promise.all(
        data.map(async (memory) => {
          if (memory.storage_path) {
            // Get a signed URL valid for 1 hour
            const { data: signedData, error: signedError } = await supabase.storage
              .from('memories')
              .createSignedUrl(memory.storage_path, 3600); // 1 hour expiry

            if (!signedError && signedData) {
              return { ...memory, signed_url: signedData.signedUrl };
            }
          }
          // Fallback to image_url if no storage_path (old data)
          return { ...memory, signed_url: memory.image_url };
        })
      );
      setMemories(memoriesWithUrls);
    }
  }

  function subscribeToMemories() {
    if (!couple) return;

    const subscription = supabase
      .channel(`memories_changes_${couple.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memories',
          filter: `couple_id=eq.${couple.id}`
        },
        (payload) => {
          console.log('📸 Memory change received:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            setMemories(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setMemories(prev => prev.filter(memory => memory.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Memories subscription status:', status);
      });

    return () => {
      subscription.unsubscribe();
    };
  }

  async function pickImage() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      showAlert('Permission Required', 'Please allow access to your photo library!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }

  async function addMemory() {
    if (!couple) {
      showAlert('Error', 'No couple found. Please pair with your partner first!');
      return;
    }

    if (!selectedImage) {
      showAlert('Error', 'Please select an image!');
      return;
    }

    if (!newMemoryDescription.trim()) {
      showAlert('Error', 'Please add a description!');
      return;
    }

    if (!user) {
      showAlert('Error', 'You must be logged in to add memories!');
      return;
    }

    setUploading(true);

    try {
      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(selectedImage, {
        encoding: 'base64',
      });

      // Convert base64 to binary
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Generate unique filename
      const fileExt = selectedImage.split('.').pop() || 'jpg';
      const fileName = `${couple.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memories')
        .upload(fileName, bytes.buffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image: ' + uploadError.message);
      }

      // Get signed URL for immediate display
      const { data: signedData } = await supabase.storage
        .from('memories')
        .createSignedUrl(fileName, 3600);

      // Save to database with storage path
      const { error: dbError } = await supabase.from('memories').insert({
        couple_id: couple.id,
        auth_user_id: user.id,
        description: newMemoryDescription.trim(),
        storage_path: fileName,
        image_url: signedData?.signedUrl || '', // Store signed URL as fallback
      });

      if (dbError) throw dbError;

      // Add happiness to pet
      await addHappiness(5);

      // Reload memories to get fresh signed URLs
      await loadMemories(couple.id);

      setNewMemoryDescription('');
      setSelectedImage(null);
      setShowAddModal(false);
      showAlert('Success!', 'Memory added! Your pet gained 5 happiness! 💕');
    } catch (error) {
      console.error('Error adding memory:', error);
      showAlert('Error', error.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteMemory(memoryId) {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('Deleting memory:', memoryId);
            const { error } = await supabase
              .from('memories')
              .delete()
              .eq('id', memoryId);

            if (error) {
              console.error('Delete error:', error);
              showAlert('Error', error.message);
            } else {
              console.log('Memory deleted successfully');
              setMemories(prev => prev.filter(m => m.id !== memoryId));
            }
          },
        },
      ]
    );
  }

  async function addHappiness(amount) {
    if (!couple) return;

    const { data: petData } = await supabase
      .from('pets')
      .select('*')
      .eq('couple_id', couple.id)
      .single();

    if (!petData) return;

    const newHappiness = Math.min(100, petData.happiness + amount);

    await supabase
      .from('pets')
      .update({ happiness: newHappiness })
      .eq('id', petData.id);
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
        <Text style={styles.headerTitle}>Photo Album</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Memory</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {memories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyText}>No memories yet!</Text>
            <Text style={styles.emptySubtext}>
              Start capturing your special moments together
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {memories.map((memory, index) => (
              <Animatable.View
                key={memory.id}
                animation="fadeInUp"
                delay={index * 100}
                style={styles.memoryCard}
              >
                <TouchableOpacity
                  onPress={() => {
                    setViewingImage(memory.signed_url || memory.image_url);
                    setShowImageModal(true);
                  }}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: memory.signed_url || memory.image_url }}
                    style={styles.memoryImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <View style={styles.memoryContent}>
                  <Text style={styles.memoryDescription} numberOfLines={2}>
                    {memory.description}
                  </Text>
                  <View style={styles.memoryFooter}>
                    <Text style={styles.memoryDate}>
                      {new Date(memory.created_at).toLocaleDateString()}
                    </Text>
                    {memory.auth_user_id === user?.id && (
                      <TouchableOpacity onPress={() => deleteMemory(memory.id)}>
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Animatable.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Memory Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Memory</Text>

            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                <Text style={styles.imagePickerEmoji}>📷</Text>
                <Text style={styles.imagePickerText}>Tap to select photo</Text>
              </TouchableOpacity>
            )}

            {selectedImage && (
              <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
                <Text style={styles.changeImageText}>Change Photo</Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={styles.input}
              placeholder="Describe this memory..."
              placeholderTextColor={theme.border}
              value={newMemoryDescription}
              onChangeText={setNewMemoryDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewMemoryDescription('');
                  setSelectedImage(null);
                }}
                disabled={uploading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={addMemory}
                disabled={uploading}
              >
                <Text style={styles.buttonText}>
                  {uploading ? 'Saving...' : 'Save (+5 ❤️)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Screen Image Modal */}
      <Modal visible={showImageModal} animationType="fade" transparent>
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowImageModal(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullScreenTouchable}
            activeOpacity={1}
            onPress={() => setShowImageModal(false)}
          >
            <Image
              source={{ uri: viewingImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
  },
  addButton: {
    backgroundColor: theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
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
    paddingHorizontal: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  memoryCard: {
    width: '48%',
    backgroundColor: theme.card,
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.backgroundSecondary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  memoryImage: {
    width: '100%',
    height: 150,
  },
  memoryContent: {
    padding: 10,
  },
  memoryDescription: {
    fontSize: 14,
    color: theme.text,
    marginBottom: 8,
  },
  memoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memoryDate: {
    fontSize: 10,
    color: theme.secondary,
  },
  deleteText: {
    fontSize: 10,
    color: theme.primary,
    fontWeight: 'bold',
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
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  imagePicker: {
    backgroundColor: theme.background,
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.border,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  imagePickerEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  imagePickerText: {
    color: theme.secondary,
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 10,
  },
  changeImageButton: {
    alignItems: 'center',
    marginBottom: 15,
  },
  changeImageText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: theme.background,
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: theme.border,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: theme.border,
  },
  saveButton: {
    backgroundColor: theme.primary,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  fullScreenTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
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
});
