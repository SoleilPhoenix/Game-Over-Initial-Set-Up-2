/**
 * Game-Over App Color Palette
 * Based on PRD and UI/UX Design Specifications
 */

export const colors = {
  // Primary Colors
  primary: '#258CF4',
  primaryLight: '#5AA5F7',
  primaryDark: '#1A6BC4',

  // Semantic Colors
  success: '#47B881',
  warning: '#FF8551',
  error: '#E12D39',
  info: '#7B68EE',

  // Light Mode - Neutral Colors
  light: {
    background: '#F5F7F8',
    surface: '#FFFFFF',
    textPrimary: '#1A202C',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    primary: '#258CF4',
    success: '#47B881',
    warning: '#FF8551',
    error: '#E12D39',
  },

  // Dark Mode - Neutral Colors
  dark: {
    background: '#101922',
    surface: '#1B2127',
    deepNavy: '#2D3748',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CABBA',
    textTertiary: '#6B7785',
    border: '#283039',
  },

  // Social Platform Colors
  social: {
    instagram: '#E4405F',
    whatsapp: '#25D366',
    tiktok: '#000000',
    snapchat: '#FFFC00',
    facebook: '#1877F2',
    twitter: '#000000',
    apple: '#000000',
    google: '#4285F4',
  },

  // Gradients
  gradients: {
    primary: ['#258CF4', '#1A6BC4'],
    surfaceLight: ['#FFFFFF', '#F0F2F5'],
    surfaceDark: ['#1B2127', '#222A33'],
  },

  // Transparent variants
  transparent: {
    primary10: 'rgba(37, 140, 244, 0.1)',
    primary20: 'rgba(37, 140, 244, 0.2)',
    primary30: 'rgba(37, 140, 244, 0.3)',
    black10: 'rgba(0, 0, 0, 0.1)',
    black50: 'rgba(0, 0, 0, 0.5)',
    white10: 'rgba(255, 255, 255, 0.1)',
    white50: 'rgba(255, 255, 255, 0.5)',
  },
} as const;

export type ColorScheme = 'light' | 'dark';

export function getColors(scheme: ColorScheme) {
  return {
    ...colors,
    ...(scheme === 'dark' ? colors.dark : colors.light),
  };
}
