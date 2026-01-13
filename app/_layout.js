import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, LogBox, Image } from 'react-native';
import { AuthProvider, useAuth } from '../lib/authContext';
import { ThemeProvider, useTheme } from '../lib/themeContext';
import { registerForPushNotifications, savePushToken } from '../lib/notificationHelper';
import mobileAds from 'react-native-google-mobile-ads';

// Ignore AuthSessionMissingError - it's expected when no user is logged in
LogBox.ignoreLogs([
  'Auth session missing',
  'AuthSessionMissingError',
  'Auth error: [AuthSessionMissingError',
]);

// Suppress console errors for AuthSessionMissingError
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('AuthSessionMissingError') || message.includes('Auth session missing')) {
    return; // Suppress this specific error
  }
  originalConsoleError(...args);
};

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
    // Initialize Google Mobile Ads SDK
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('✅ Google Mobile Ads initialized successfully');
        console.log('Adapter statuses:', adapterStatuses);
      })
      .catch(error => {
        console.error('❌ Failed to initialize Google Mobile Ads:', error);
      });
  }, []);

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

  const { theme } = useTheme();

  // Show loading screen while checking auth status
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Image
          source={require('../assets/spark_logo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" options={{
        presentation: 'modal',
        headerShown: true,
        title: 'Profile',
        headerBackTitle: 'Back',
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          color: theme.text,
        },
      }} />
    </Stack>
  );
}

// Root component that wraps everything with ThemeProvider and AuthProvider
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 250,
    height: 250,
  },
});
