import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

// Register widgets
if (typeof require.resolve === 'function') {
  try {
    require.resolve('react-native-android-widget');
    require('../widgets');
  } catch (e) {
    // Widget not available
  }
}

// Simple error boundary setup
export default function RootLayout() {
  useEffect(() => {
    // Log any unhandled errors
    const errorHandler = (error) => {
      console.error('App Error:', error);
    };

    // This will catch some errors
    if (typeof ErrorUtils !== 'undefined') {
      ErrorUtils.setGlobalHandler(errorHandler);
    }
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
