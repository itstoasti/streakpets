import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/authContext';
import { getCoupleData } from '../../lib/storage';
import { getPendingTurnCount } from '../../lib/gameHelper';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateGalleryWidget } from '../../lib/widgetHelper';
import { startWidgetBackgroundSync } from '../../lib/widgetBackgroundSync';

export default function TabsLayout() {
  const { user } = useAuth();
  const [pendingTurnCount, setPendingTurnCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Start background widget sync (15-minute intervals)
    startWidgetBackgroundSync();

    let gamesSubscription;
    let widgetSubscription;

    async function loadPendingTurns() {
      const coupleData = await getCoupleData();
      if (!coupleData) return;

      const count = await getPendingTurnCount(coupleData.id, user.id);
      setPendingTurnCount(count);
      console.log('📊 Initial pending turns badge:', count);

      // Subscribe to game updates to refresh badge in real-time
      // Note: Using polling as a workaround for Realtime schema caching issues
      // Once Supabase Realtime cache is cleared, we can switch back to postgres_changes
      const pollInterval = setInterval(async () => {
        const newCount = await getPendingTurnCount(coupleData.id, user.id);
        setPendingTurnCount(newCount);
      }, 5000); // Poll every 5 seconds

      // Store interval for cleanup
      gamesSubscription = { unsubscribe: () => clearInterval(pollInterval) };

      // Subscribe to widget selection changes (for real-time widget sync)
      // Note: Widget sync uses background polling (widgetBackgroundSync.js)
      // Real-time subscription disabled due to Supabase Realtime schema caching issue
      // The 15-minute background sync handles widget updates
      console.log('ℹ️ Widget sync uses background polling (see widgetBackgroundSync.js)');
      widgetSubscription = null;
    }

    loadPendingTurns();

    return () => {
      if (gamesSubscription) {
        gamesSubscription.unsubscribe();
      }
      if (widgetSubscription) {
        widgetSubscription.unsubscribe();
      }
    };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF1493',
        tabBarInactiveTintColor: '#FFB6D9',
        tabBarStyle: {
          backgroundColor: '#FFF0F5',
          borderTopWidth: 2,
          borderTopColor: '#FFE5EC',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#FFE5EC',
        },
        headerTintColor: '#FF1493',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
          headerTitle: '💕 Streak Pets 💕',
          headerTitleAlign: 'center',
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
          headerTitle: '🛒 Pet Shop',
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
          headerTitle: '✨ Activities',
          tabBarBadge: pendingTurnCount > 0 ? pendingTurnCount : undefined,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create" size={size} color={color} />
          ),
          headerTitle: '📝 Shared Notes',
        }}
      />
      <Tabs.Screen
        name="album"
        options={{
          title: 'Album',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images" size={size} color={color} />
          ),
          headerTitle: '📸 Memories',
        }}
      />
    </Tabs>
  );
}
