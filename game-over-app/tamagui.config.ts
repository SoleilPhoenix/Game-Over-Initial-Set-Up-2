import { createAnimations } from '@tamagui/animations-react-native';
import { createInterFont } from '@tamagui/font-inter';
import { createMedia } from '@tamagui/react-native-media-driver';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens as defaultTokens } from '@tamagui/themes';
import { createTamagui, createTokens } from 'tamagui';

// Animations
const animations = createAnimations({
  bouncy: {
    type: 'spring',
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
  lazy: {
    type: 'spring',
    damping: 20,
    stiffness: 60,
  },
  quick: {
    type: 'spring',
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  medium: {
    type: 'spring',
    damping: 15,
    mass: 1,
    stiffness: 150,
  },
  slow: {
    type: 'spring',
    damping: 20,
    stiffness: 60,
  },
});

// Fonts
const headingFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 40,
    10: 48,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
    7: '700',
    8: '800',
  },
  letterSpacing: {
    4: 0,
    5: -0.5,
    6: -0.5,
    7: -1,
    8: -1,
  },
});

const bodyFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
  },
  weight: {
    4: '400',
    5: '500',
    6: '600',
  },
});

// Custom tokens — kept in sync with src/constants/designSystem.ts
// (EDITORIAL_DARK + EDITORIAL_LIGHT). Both surfaces of the design system
// must agree, otherwise a screen mixing Tamagui $tokens and useTheme()
// reads two different palettes for the same semantic key.
const customTokens = createTokens({
  ...defaultTokens,
  color: {
    ...defaultTokens.color,
    // Primary — Champagne Gold (editorial)
    primary: '#C6A75E',
    primaryLight: '#E8DCC8',
    primaryDark: '#8A7338',

    // Semantic — soft palette per editorial guideline (warm, never harsh)
    success: '#4ADE80',
    warning: '#E8B14C',
    error: '#E8836B',
    info: '#7B68EE',

    // Light mode — "Ethereal Architect" warm off-whites
    lightBackground: '#FFFFFF',
    lightSurface: '#FBF9F4',
    lightSurfaceLow: '#F7F5F0',
    lightSurfaceHigh: '#F2EDE1',
    lightTextPrimary: '#1F2A44',
    lightTextSecondary: 'rgba(31,42,68,0.72)',
    lightTextTertiary: 'rgba(31,42,68,0.48)',
    lightBorder: 'rgba(31,42,68,0.15)',

    // Dark mode — Midnight Navy editorial palette
    darkBackground: '#0D1B2A',
    darkSurface: '#12253A',
    darkSurfaceCard: '#1A2F47',
    darkSurfaceHigh: '#22385A',
    darkSurfaceBright: '#2C446B',
    darkTextPrimary: '#FFFFFF',
    darkTextSecondary: 'rgba(255,255,255,0.72)',
    darkTextTertiary: 'rgba(255,255,255,0.48)',
    darkBorder: 'rgba(230,220,200,0.15)',
    darkBorderLight: 'rgba(230,220,200,0.08)',

    // Glassmorphic colors (used by GlassPanel — pre-editorial component)
    glassBackground: 'rgba(26,47,71,0.7)',
    glassBackgroundLight: 'rgba(26,47,71,0.6)',
    glassBorder: 'rgba(230,220,200,0.15)',

    // Common
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',

    // Social colors
    apple: '#000000',
    google: '#4285F4',
    facebook: '#1877F2',
  },
  space: {
    ...defaultTokens.space,
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    true: 16, // default
  },
  size: {
    ...defaultTokens.size,
    0: 0,
    0.5: 2,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    20: 80,
    true: 44, // default button height
    buttonHeight: 48,
    inputHeight: 56,
    iconSm: 16,
    iconMd: 24,
    iconLg: 32,
    avatarSm: 32,
    avatarMd: 48,
    avatarLg: 64,
    cardMin: 120,
  },
  radius: {
    ...defaultTokens.radius,
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    true: 12, // default
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  zIndex: {
    ...defaultTokens.zIndex,
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
    base: 0,
    card: 1,
    dropdown: 10,
    sticky: 50,
    modal: 100,
    overlay: 150,
    toast: 200,
  },
});

// Light theme
const lightTheme = {
  background: customTokens.color.lightBackground,
  backgroundHover: customTokens.color.lightSurface,
  backgroundPress: customTokens.color.lightBorder,
  backgroundFocus: customTokens.color.lightSurface,
  backgroundStrong: customTokens.color.lightSurface,
  backgroundTransparent: 'transparent',

  color: customTokens.color.lightTextPrimary,
  colorHover: customTokens.color.lightTextPrimary,
  colorPress: customTokens.color.lightTextSecondary,
  colorFocus: customTokens.color.lightTextPrimary,
  colorTransparent: 'transparent',

  borderColor: customTokens.color.lightBorder,
  borderColorHover: customTokens.color.primary,
  borderColorPress: customTokens.color.primaryDark,
  borderColorFocus: customTokens.color.primary,

  placeholderColor: customTokens.color.lightTextTertiary,

  // Custom semantic tokens
  primary: customTokens.color.primary,
  primaryHover: customTokens.color.primaryLight,
  primaryPress: customTokens.color.primaryDark,

  surface: customTokens.color.lightSurface,
  surfaceHover: customTokens.color.lightBackground,

  textPrimary: customTokens.color.lightTextPrimary,
  textSecondary: customTokens.color.lightTextSecondary,
  textMuted: customTokens.color.lightTextTertiary,

  success: customTokens.color.success,
  warning: customTokens.color.warning,
  error: customTokens.color.error,
  info: customTokens.color.info,

  shadowColor: 'rgba(0, 0, 0, 0.1)',
  shadowColorStrong: 'rgba(0, 0, 0, 0.2)',
};

// Dark theme — editorial Midnight Navy palette (sync with EDITORIAL_DARK)
const darkTheme = {
  background: customTokens.color.darkBackground,
  backgroundHover: customTokens.color.darkSurface,
  backgroundPress: customTokens.color.darkSurfaceHigh,
  backgroundFocus: customTokens.color.darkSurface,
  backgroundStrong: customTokens.color.darkSurfaceHigh,
  backgroundTransparent: 'transparent',

  color: customTokens.color.darkTextPrimary,
  colorHover: customTokens.color.darkTextPrimary,
  colorPress: customTokens.color.darkTextSecondary,
  colorFocus: customTokens.color.darkTextPrimary,
  colorTransparent: 'transparent',

  borderColor: customTokens.color.darkBorder,
  borderColorHover: customTokens.color.primary,
  borderColorPress: customTokens.color.primaryDark,
  borderColorFocus: customTokens.color.primary,

  placeholderColor: customTokens.color.darkTextTertiary,

  // Custom semantic tokens
  primary: customTokens.color.primary,
  primaryHover: customTokens.color.primaryLight,
  primaryPress: customTokens.color.primaryDark,

  surface: customTokens.color.darkSurface,
  surfaceCard: customTokens.color.darkSurfaceCard,
  surfaceHover: customTokens.color.darkSurfaceHigh,
  surfaceHigh: customTokens.color.darkSurfaceHigh,
  surfaceBright: customTokens.color.darkSurfaceBright,

  textPrimary: customTokens.color.darkTextPrimary,
  textSecondary: customTokens.color.darkTextSecondary,
  textMuted: customTokens.color.darkTextTertiary,

  // Glassmorphic
  glass: customTokens.color.glassBackground,
  glassLight: customTokens.color.glassBackgroundLight,
  glassBorder: customTokens.color.glassBorder,

  success: customTokens.color.success,
  warning: customTokens.color.warning,
  error: customTokens.color.error,
  info: customTokens.color.info,

  shadowColor: 'rgba(0, 0, 0, 0.3)',
  shadowColorStrong: 'rgba(0, 0, 0, 0.5)',
};

// Media queries
const media = createMedia({
  xs: { maxWidth: 660 },
  sm: { maxWidth: 800 },
  md: { maxWidth: 1020 },
  lg: { maxWidth: 1280 },
  xl: { maxWidth: 1420 },
  xxl: { maxWidth: 1600 },
  gtXs: { minWidth: 660 + 1 },
  gtSm: { minWidth: 800 + 1 },
  gtMd: { minWidth: 1020 + 1 },
  gtLg: { minWidth: 1280 + 1 },
  short: { maxHeight: 820 },
  tall: { minHeight: 820 },
  hoverNone: { hover: 'none' },
  pointerCoarse: { pointer: 'coarse' },
});

export const config = createTamagui({
  defaultFont: 'body',
  animations,
  // React Native doesn't use CSS media queries — prefers-color-scheme injection
  // adds dead classes. Theme is driven by our themeStore + ThemeProvider wrapper.
  shouldAddPrefersColorThemes: false,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    light: lightTheme,
    dark: darkTheme,
    // Component-specific themes
    light_Button: {
      ...lightTheme,
      background: customTokens.color.primary,
      backgroundHover: customTokens.color.primaryLight,
      backgroundPress: customTokens.color.primaryDark,
      color: customTokens.color.white,
    },
    dark_Button: {
      ...darkTheme,
      background: customTokens.color.primary,
      backgroundHover: customTokens.color.primaryLight,
      backgroundPress: customTokens.color.primaryDark,
      color: customTokens.color.white,
    },
    light_Card: {
      ...lightTheme,
      background: customTokens.color.lightSurface,
    },
    dark_Card: {
      ...darkTheme,
      background: customTokens.color.darkSurface,
    },
  },
  tokens: customTokens,
  media,
});

export default config;

// Type exports
export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
