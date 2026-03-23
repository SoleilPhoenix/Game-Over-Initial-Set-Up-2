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
  primary: colors.primary,                 // '#5A7EB0'
  primaryLight: colors.primaryLight,       // '#7A9BC4'
  primaryDark: colors.primaryDark,         // '#456A9C'

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

/**
 * Named card style variants — use these instead of choosing background colors ad-hoc.
 *
 * card      — primary surface, used for main content cards (events, packages, profile sections)
 * glassCard — translucent glass effect, used for overlays and contextual cards
 * deepCard  — deeper background, used for nested content within a card (sub-sections)
 */
export const CARD_VARIANTS = {
  /** Opaque surface — main content cards */
  card:      { backgroundColor: DARK_THEME.surface },          // '#1E2329'
  /** Translucent glass — overlays, contextual cards */
  glassCard: { backgroundColor: 'rgba(45, 55, 72, 0.4)' },
  /** Deep surface — nested content within cards */
  deepCard:  { backgroundColor: DARK_THEME.surfaceCard },      // '#23272F'
} as const;
