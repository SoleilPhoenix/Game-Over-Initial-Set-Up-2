/**
 * Game-Over App Color Palette
 * Based on PRD and UI/UX Design Specifications
 * Updated to match Figma/HTML designs exactly
 */

export const colors = {
  // Primary Colors - Updated to match UI designs
  primary: '#4A6FA5',
  primaryLight: '#5A7EB0',
  primaryDark: '#3B5984',

  // Semantic Colors
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  info: '#7B68EE',

  // Light Mode - Neutral Colors (kept for potential light mode support)
  light: {
    background: '#F6F7F7',
    surface: '#FFFFFF',
    textPrimary: '#1A202C',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    primary: '#4A6FA5',
    success: '#22C55E',
    warning: '#EAB308',
    error: '#EF4444',
  },

  // Dark Mode - Neutral Colors (Primary theme per UI designs)
  dark: {
    background: '#15181D',
    backgroundAlt: '#2D3748',  // Deep Navy - main background for most screens
    surface: '#1E2329',
    surfaceCard: '#23272F',
    deepNavy: '#2D3748',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
  },

  // Glassmorphic effects
  glass: {
    background: 'rgba(45, 55, 72, 0.7)',
    backgroundLight: 'rgba(45, 55, 72, 0.6)',
    border: 'rgba(255, 255, 255, 0.08)',
    overlay: 'rgba(255, 255, 255, 0.05)',
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
