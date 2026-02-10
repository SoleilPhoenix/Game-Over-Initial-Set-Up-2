import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Game Over',
  slug: 'game-over-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'gameover',
  userInterfaceStyle: 'dark', // Force dark mode to match app
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#15181D', // Match DARK_THEME.background
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.gameover.ios',
    usesAppleSignIn: true,
    associatedDomains: ['applinks:gameover.app'],
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#15181D',
      dark: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#15181D',
      },
    },
    infoPlist: {
      UILaunchStoryboardName: 'SplashScreen',
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ['gameover'],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#101922',
    },
    package: 'app.gameover.android',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'gameover.app',
            pathPrefix: '/invite',
          },
          {
            scheme: 'https',
            host: 'gameover.app',
            pathPrefix: '/event',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-apple-authentication',
    'expo-calendar',
    [
      '@stripe/stripe-react-native',
      {
        merchantIdentifier: 'merchant.app.gameover',
        enableGooglePay: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    router: {
      origin: false,
    },
    // EAS project ID will be set when building with EAS
    // eas: {
    //   projectId: 'your-project-id',
    // },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    googleClientIdIos: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    googleClientIdAndroid: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    googleClientIdWeb: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    facebookAppId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
  },
});
