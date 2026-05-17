/**
 * Game-Over App Color Palette
 *
 * LEGACY MODULE — kept for backwards-compat with screens that still reference
 * `colors.*` or `DARK_THEME.*` from `src/constants/theme.ts`. The underlying
 * values were remapped onto the editorial palette so old consumers render
 * with the new theme automatically. New code should consume `useTheme()` /
 * `EDITORIAL_DARK` / `EDITORIAL_LIGHT` from `src/constants/designSystem.ts`.
 */

export const colors = {
  // Primary — Champagne Gold (editorial redesign)
  primary: '#C6A75E',
  primaryLight: '#E8DCC8',
  primaryDark: '#8A7338',

  // Semantic Colors — soft editorial palette (warm, never harsh)
  success: '#4ADE80',
  warning: '#E8B14C',
  error: '#E8836B',
  info: '#7B68EE',

  // Light Mode — "Ethereal Architect" warm off-whites
  light: {
    background: '#FFFFFF',
    surface: '#FBF9F4',
    textPrimary: '#1F2A44',
    textSecondary: 'rgba(31,42,68,0.72)',
    textTertiary: 'rgba(31,42,68,0.48)',
    border: 'rgba(31,42,68,0.15)',
    primary: '#1F2A44',
    success: '#2F8F5E',
    warning: '#B48A3C',
    error: '#C66A55',
  },

  // Dark Mode — Midnight Navy editorial palette
  dark: {
    background: '#0D1B2A',
    backgroundAlt: '#22385A',   // surfaceHigh — was deepNavy in old palette
    surface: '#12253A',
    surfaceCard: '#1A2F47',
    deepNavy: '#22385A',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.72)',
    textTertiary: 'rgba(255,255,255,0.48)',
    border: 'rgba(230,220,200,0.15)',
    borderLight: 'rgba(230,220,200,0.08)',
  },

  // Glassmorphic effects — navy-tinted (was warm-gray before)
  glass: {
    background: 'rgba(26,47,71,0.7)',
    backgroundLight: 'rgba(26,47,71,0.6)',
    border: 'rgba(230,220,200,0.15)',
    overlay: 'rgba(255,255,255,0.05)',
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
    primary: ['#C6A75E', '#8A7338'],     // gold → deep gold (editorial)
    surfaceLight: ['#FFFFFF', '#F7F5F0'],
    surfaceDark: ['#0D1B2A', '#12253A'],
  },

  // Transparent variants — gold-tinted (was muted-blue)
  transparent: {
    primary10: 'rgba(198,167,94,0.1)',
    primary20: 'rgba(198,167,94,0.2)',
    primary30: 'rgba(198,167,94,0.3)',
    black10: 'rgba(0,0,0,0.1)',
    black50: 'rgba(0,0,0,0.5)',
    white10: 'rgba(255,255,255,0.1)',
    white50: 'rgba(255,255,255,0.5)',
  },
} as const;

export type ColorScheme = 'light' | 'dark';

export function getColors(scheme: ColorScheme) {
  return {
    ...colors,
    ...(scheme === 'dark' ? colors.dark : colors.light),
  };
}
