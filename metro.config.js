const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for react-native-google-mobile-ads
config.resolver.sourceExts.push('mjs');

module.exports = config;
