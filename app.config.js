module.exports = ({ config }) => {
  const widgetConfig = {
    widgets: [
      {
        name: 'GalleryWidget',
        label: 'Spark Gallery',
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
    name: 'Spark',
    slug: 'couples-pet-fresh',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/spark_logo.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.couplespet.app',
    },
    android: {
      icon: './assets/icon.png',
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#2d4a7c',
      },
      package: 'com.couplespet.app',
      permissions: [
        'android.permission.INTERNET',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.POST_NOTIFICATIONS',
      ],
      usesCleartextTraffic: true,
      networkSecurityConfig: './android-network-security-config.xml',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      ['react-native-android-widget', widgetConfig],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#FF1493',
          androidMode: 'default',
          androidCollapsedTitle: '⚡ Spark',
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: 'ca-app-pub-5918407268001346~3613576757',
          iosAppId: 'ca-app-pub-3940256099942544~1458002511',
        },
      ],
    ],
    notification: {
      icon: './assets/icon.png',
      color: '#FF1493',
      androidMode: 'default',
      androidCollapsedTitle: '⚡ Spark',
    },
    scheme: 'couplespet',
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: '5c173b5c-976c-4090-8db1-c80a708c1189',
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  };
};
