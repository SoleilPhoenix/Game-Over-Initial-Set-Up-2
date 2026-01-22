/**
 * Centralized Dark Theme for Game-Over App
 * All screens should import from here instead of defining local THEME objects
 */

import { colors } from './colors';

/**
 * Dark glassmorphic theme matching UI specifications
 * Used across all app screens for consistent styling
 */
export const DARK_THEME = {
  // Core backgrounds
  background: colors.dark.background,      // '#15181D'
  deepNavy: colors.dark.deepNavy,          // '#2D3748'
  surface: colors.dark.surface,            // '#1E2329'
  surfaceCard: colors.dark.surfaceCard,    // '#23272F'

  // Glassmorphic effects
  glass: colors.glass.background,          // 'rgba(45, 55, 72, 0.7)'
  glassLight: colors.glass.backgroundLight, // 'rgba(45, 55, 72, 0.6)'
  glassBorder: colors.glass.border,        // 'rgba(255, 255, 255, 0.08)'
  glassOverlay: colors.glass.overlay,      // 'rgba(255, 255, 255, 0.05)'

  // Primary accent
  primary: colors.primary,                 // '#4A6FA5'
  primaryLight: colors.primaryLight,       // '#5A7EB0'
  primaryDark: colors.primaryDark,         // '#3B5984'

  // Text colors
  textPrimary: colors.dark.textPrimary,    // '#FFFFFF'
  textSecondary: colors.dark.textSecondary, // '#D1D5DB'
  textTertiary: colors.dark.textTertiary,  // '#9CA3AF'

  // Semantic colors
  error: colors.error,                     // '#EF4444'
  success: colors.success,                 // '#22C55E'
  warning: colors.warning,                 // '#EAB308'
  info: colors.info,                       // '#7B68EE'

  // Border colors
  border: colors.dark.border,              // 'rgba(255, 255, 255, 0.08)'
  borderLight: colors.dark.borderLight,    // 'rgba(255, 255, 255, 0.05)'
} as const;

export type DarkTheme = typeof DARK_THEME;
