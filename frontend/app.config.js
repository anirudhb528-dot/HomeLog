// Expo app configuration (replaces app.json so the API URL can come from the
// environment). The Axios client reads `extra.apiBaseUrl`; set EXPO_PUBLIC_API_URL
// to your deployed backend for preview/production builds.
const PHOTO_PERMISSION =
  'HomeLog needs access to your photos so you can attach receipt and profile images.';

module.exports = {
  expo: {
    name: 'HomeLog',
    slug: 'homelog',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    scheme: 'homelog',
    icon: './assets/icon.png',
    // OTA updates are matched to the app version.
    runtimeVersion: { policy: 'appVersion' },
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0F766E',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'app.homelog',
      infoPlist: {
        NSPhotoLibraryUsageDescription: PHOTO_PERMISSION,
      },
    },
    android: {
      package: 'app.homelog',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0F766E',
      },
    },
    web: {
      bundler: 'metro',
      favicon: './assets/favicon.png',
    },
    plugins: [['expo-image-picker', { photosPermission: PHOTO_PERMISSION }]],
    extra: {
      // Default to localhost for dev; override per build via EXPO_PUBLIC_API_URL.
      apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
    },
  },
};
