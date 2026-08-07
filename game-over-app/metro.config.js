const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Sentry's Metro serializer (withSentryConfig from @sentry/react-native/metro)
// is intentionally disabled — it crashes Expo SDK 54's Metro with:
//   TypeError: Cannot read properties of undefined (reading 'match')
//   at determineDebugIdFromBundleSource (sentryMetroSerializer.js)
// @sentry/react-native 7.x's serializer is incompatible with the Metro
// version shipped in SDK 54. JS-side Sentry.init() still runs and captures
// crashes — we lose only automatic source-map upload + debug IDs.
// Re-enable when bumping to SDK 55+ + @sentry/react-native 8.x.
module.exports = config;
