import 'expo-router/entry';

// Register widgets
if (require.resolve('react-native-android-widget')) {
  require('./widgets');
}
