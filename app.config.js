module.exports = ({ config }) => {
  const widgetConfig = {
    widgets: [
      {
        name: 'GalleryWidget',
        label: 'Couples Pet Gallery',
        description: 'View your whiteboard drawings',
        minWidth: '200dp',
        minHeight: '200dp',
        targetCellWidth: 2,
        targetCellHeight: 2,
        updatePeriodMillis: 0, // Update as frequently as possible
        previewImage: './assets/icon.png', // Using existing icon as placeholder
      },
    ],
  };

  return {
    ...config,
    name: 'Couples Pet',
    slug: 'couples-pet-fresh',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#FFE5EC',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.couplespet.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFE5EC',
      },
      package: 'com.couplespet.app',
      permissions: [
        'android.permission.INTERNET',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      ['react-native-android-widget', widgetConfig],
    ],
    scheme: 'couplespet',
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: '5c173b5c-976c-4090-8db1-c80a708c1189',
      },
    },
  };
};
