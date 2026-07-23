/**
 * Centralized Dark Theme for Game-Over App
 * All screens should import from here instead of defining local THEME objects
 */

import { colors } from './colors';

/**
 * Dark glassmorphic theme matching UI specifications
 * Used across all app screens for consistent styling
 */
/**
 * Resolved values are sourced from `colors.ts`, which was remapped onto
 * the editorial Midnight Navy + Champagne Gold palette. The inline
 * comments below show the currently-resolved hex value, not the legacy
 * pre-redesign value. See `src/constants/designSystem.ts` for the
 * canonical EDITORIAL_DARK / EDITORIAL_LIGHT token definitions.
 */
export const DARK_THEME = {
  // Core backgrounds — editorial Midnight Navy palette
  background: colors.dark.background,      // '#0D1B2A'
  deepNavy: colors.dark.deepNavy,          // '#22385A' (surfaceHigh)
  surface: colors.dark.surface,            // '#12253A' (surfaceLow)
  surfaceCard: colors.dark.surfaceCard,    // '#1A2F47'

  // Glassmorphic effects — navy-tinted
  glass: colors.glass.background,          // 'rgba(26,47,71,0.7)'
  glassLight: colors.glass.backgroundLight, // 'rgba(26,47,71,0.6)'
  glassBorder: colors.glass.border,        // 'rgba(230,220,200,0.15)'
  glassOverlay: colors.glass.overlay,      // 'rgba(255,255,255,0.05)'

  // Primary accent — Champagne Gold
  primary: colors.primary,                 // '#C6A75E'
  primaryLight: colors.primaryLight,       // '#E8DCC8' (cream)
  primaryDark: colors.primaryDark,         // '#8A7338' (deep gold)

  // Text colors
  textPrimary: colors.dark.textPrimary,    // '#FFFFFF'
  textSecondary: colors.dark.textSecondary, // 'rgba(255,255,255,0.72)'
  textTertiary: colors.dark.textTertiary,  // 'rgba(255,255,255,0.48)'

  // Semantic colors — soft editorial palette
  error: colors.error,                     // '#E8836B' (terracotta)
  success: colors.success,                 // '#4ADE80'
  warning: colors.warning,                 // '#E8B14C'
  info: colors.info,                       // '#7B68EE'

  // Border colors
  border: colors.dark.border,              // 'rgba(230,220,200,0.15)'
  borderLight: colors.dark.borderLight,    // 'rgba(230,220,200,0.08)'
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
  card:      { backgroundColor: DARK_THEME.surface },          // '#12253A' surfaceLow
  /** Translucent glass — overlays, contextual cards */
  glassCard: { backgroundColor: 'rgba(26,47,71,0.4)' },
  /** Deep surface — nested content within cards */
  deepCard:  { backgroundColor: DARK_THEME.surfaceCard },      // '#1A2F47' surfaceCard
} as const;
