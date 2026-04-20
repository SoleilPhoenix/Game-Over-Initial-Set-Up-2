const { getDefaultConfig } = require('expo/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');

const config = getDefaultConfig(__dirname);

// Sentry's Metro serializer injects a Debug ID that Expo Go can't consume,
// which crashes the bundler with "Debug ID was not found in the bundle".
// Only wrap the config with Sentry in production builds — dev/Expo Go runs
// the vanilla Expo Metro config.
module.exports = process.env.NODE_ENV === 'production'
  ? withSentryConfig(config)
  : config;
