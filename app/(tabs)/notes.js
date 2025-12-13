import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getCoupleData, getPetData, savePetData, getStreakData, saveStreakData } from '../../lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [couple, setCouple] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    subscribeToNotes();
  }, []);

  async function loadData() {
    // Get device user ID from AsyncStorage
    const deviceUserId = await import('../../lib/storage').then(m => m.getDeviceUserId());
    setUserId(deviceUserId);

    // Load couple from local storage
    const localCouple = await getCoupleData();

    if (isSupabaseConfigured()) {
      // Try Supabase
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${deviceUserId},user2_id.eq.${deviceUserId}`)
        .single();

      if (coupleData) {
        setCouple(coupleData);
        await loadNotes(coupleData.id);
      }
    } else {
      // Local only mode
      if (localCouple) {
        setCouple(localCouple);
        await loadNotesLocal();
      }
    }

    setLoading(false);
  }

  async function loadNotes(coupleId) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
  }

  async function loadNotesLocal() {
    try {
      const storedNotes = await AsyncStorage.getItem('notes');
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }

  async function saveNotesLocal(newNotes) {
    try {
      await AsyncStorage.setItem('notes', JSON.stringify(newNotes));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }

  function subscribeToNotes() {
    const subscription = supabase
      .channel('notes_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotes(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setNotes(prev => prev.filter(note => note.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }

  async function addNote() {
    if (!newNoteContent.trim()) {
      Alert.alert('Error', 'Please write something!');
      return;
    }

    if (isSupabaseConfigured() && couple) {
      const { error } = await supabase.from('notes').insert({
        couple_id: couple.id,
        user_id: userId,
        content: newNoteContent.trim(),
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
    } else {
      // Local mode
      const newNote = {
        id: Date.now().toString(),
        user_id: userId,
        content: newNoteContent.trim(),
        created_at: new Date().toISOString(),
      };

      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      await saveNotesLocal(updatedNotes);
    }

    // Add happiness to pet
    await addHappiness(3);

    // Update streak
    await updateStreak();

    setNewNoteContent('');
    setShowAddModal(false);
    Alert.alert('Success!', 'Note added! Your pet gained 3 happiness! 💕');
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
      streakData.lastActivityDate = new Date().toISOString();
      await saveStreakData(streakData);
    }
  }

  async function deleteNote(noteId) {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isSupabaseConfigured()) {
              const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', noteId);

              if (error) {
                Alert.alert('Error', error.message);
              }
            } else {
              // Local mode
              const updatedNotes = notes.filter(note => note.id !== noteId);
              setNotes(updatedNotes);
              await saveNotesLocal(updatedNotes);
            }
          },
        },
      ]
    );
  }

  async function addHappiness(amount) {
    const petData = await getPetData();
    if (!petData) return;

    const newHappiness = Math.min(100, petData.happiness + amount);

    if (isSupabaseConfigured() && couple) {
      await supabase
        .from('pets')
        .update({ happiness: newHappiness })
        .eq('id', petData.id);
    }

    // Update local storage (works in both modes)
    const updatedPet = { ...petData, happiness: newHappiness };
    await savePetData(updatedPet);
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Note</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>No notes yet!</Text>
            <Text style={styles.emptySubtext}>
              Share your thoughts with your partner
            </Text>
          </View>
        ) : (
          notes.map((note, index) => (
            <Animatable.View
              key={note.id}
              animation="fadeInUp"
              delay={index * 100}
              style={styles.noteCard}
            >
              <Text style={styles.noteContent}>{note.content}</Text>
              <View style={styles.noteFooter}>
                <Text style={styles.noteDate}>
                  {new Date(note.created_at).toLocaleDateString()} at{' '}
                  {new Date(note.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {note.user_id === userId && (
                  <TouchableOpacity onPress={() => deleteNote(note.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animatable.View>
          ))
        )}
      </ScrollView>

      {/* Add Note Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Note</Text>

            <TextInput
              style={styles.textArea}
              placeholder="Write something sweet..."
              placeholderTextColor="#FFB6D9"
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewNoteContent('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={addNote}
              >
                <Text style={styles.buttonText}>Save (+3 ❤️)</Text>
              </TouchableOpacity>
            </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  addButton: {
    backgroundColor: '#FF1493',
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
    color: '#FF1493',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#FF69B4',
  },
  noteCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFE5EC',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  noteContent: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    lineHeight: 24,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
    color: '#FF69B4',
  },
  deleteText: {
    fontSize: 12,
    color: '#FF1493',
    fontWeight: 'bold',
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
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 20,
    textAlign: 'center',
  },
  textArea: {
    backgroundColor: '#FFF0F5',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#FFB6D9',
    minHeight: 150,
    marginBottom: 20,
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
    backgroundColor: '#FFB6D9',
  },
  saveButton: {
    backgroundColor: '#FF1493',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
