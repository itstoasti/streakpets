import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { AuthProvider, useAuth } from '../lib/authContext';
import { registerForPushNotifications, savePushToken } from '../lib/notificationHelper';

// Ignore AuthSessionMissingError - it's expected when no user is logged in
LogBox.ignoreLogs([
  'Auth session missing',
  'AuthSessionMissingError',
]);

// Register widgets
if (typeof require.resolve === 'function') {
  try {
    require.resolve('react-native-android-widget');
    require('../widgets');
  } catch (e) {
    // Widget not available
  }
}

// Navigation component that handles auth routing
function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to welcome/login if not authenticated
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  useEffect(() => {
    // Log any unhandled errors (except expected auth errors)
    const errorHandler = (error) => {
      // Ignore AuthSessionMissingError - this is expected when user is not logged in
      if (error?.name === 'AuthSessionMissingError' || error?.message?.includes('Auth session missing')) {
        return;
      }
      console.error('App Error:', error);
    };

    // This will catch some errors
    if (typeof ErrorUtils !== 'undefined') {
      ErrorUtils.setGlobalHandler(errorHandler);
    }
  }, []);

  useEffect(() => {
    // Register for push notifications when user is authenticated
    async function setupPushNotifications() {
      if (user?.id) {
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(user.id, token);
        }
      }
    }

    setupPushNotifications();
  }, [user]);

  // Show loading screen while checking auth status
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

// Root component that wraps everything with AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
  },
});
