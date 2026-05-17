/**
 * Editorial Design System — "Ethereal Architect"
 *
 * Dual-theme design tokens for the Game Over redesign.
 * Components must consume semantic keys (background, surfaceCard, textPrimary, …)
 * and MUST NOT hard-code hex values. Use `useTheme()` to access the active theme.
 *
 * Source: UI_and_UX/New UI & UX/DESIGN (3).md + 8 stitch reference mockups.
 */

export type ThemeMode = 'dark' | 'light' | 'system';

/**
 * Semantic token keys. Both EDITORIAL_DARK and EDITORIAL_LIGHT MUST expose
 * the same set of keys — the type is enforced below.
 */
type EditorialTokens = {
  // Surface hierarchy (physical stack of paper/semi-translucent materials)
  background: string;       // base canvas
  surfaceLow: string;       // subtle section elevation
  surfaceCard: string;      // primary interactive card
  surfaceHigh: string;      // nested / elevated card
  surfaceBright: string;    // modal / floating layer

  // Brand
  primary: string;          // primary action / accent
  primarySoft: string;      // soft secondary highlight (cream)
  primaryDeep: string;      // gradient end, hover state
  accentGold: string;       // explicit champagne gold (same in both modes)

  // Text
  textPrimary: string;
  textSecondary: string;    // rgba for proper layering
  textTertiary: string;
  textGold: string;
  textOnPrimary: string;    // text on top of primary-filled button

  // Semantic
  success: string;
  error: string;
  warning: string;

  // Structure
  ghostBorder: string;      // rgba, NEVER 100% opaque (DESIGN.md rule)

  // Shadow
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
};

/**
 * DARK — Default theme, matches all 8 reference mockups (Midnight Navy + Champagne Gold).
 */
export const EDITORIAL_DARK: EditorialTokens = {
  background:    '#0D1B2A',
  surfaceLow:    '#12253A',
  surfaceCard:   '#1A2F47',
  surfaceHigh:   '#22385A',
  surfaceBright: '#2C446B',

  primary:       '#C6A75E', // Champagne Gold — CTAs, active states, icons
  primarySoft:   '#E8DCC8', // Cream — soft highlights
  primaryDeep:   '#8A7338', // gradient deep end
  accentGold:    '#C6A75E',

  textPrimary:   '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.72)',
  textTertiary:  'rgba(255,255,255,0.48)',
  textGold:      '#C6A75E',
  textOnPrimary: '#0D1B2A', // navy on gold

  success:       '#4ADE80',
  error:         '#E8836B',
  warning:       '#E8B14C',

  ghostBorder:   'rgba(230,220,200,0.15)',

  shadowColor:   '#000000',
  shadowOpacity: 0.35,
  shadowRadius:  30,
};

/**
 * LIGHT — Per DESIGN.md "Ethereal Architect" light variant.
 * Uses warm off-whites (NOT pure white everywhere) to preserve the editorial feel.
 */
export const EDITORIAL_LIGHT: EditorialTokens = {
  background:    '#FFFFFF',
  surfaceLow:    '#F7F5F0',
  surfaceCard:   '#FBF9F4',
  surfaceHigh:   '#F2EDE1',
  surfaceBright: '#FFFFFF',

  primary:       '#1F2A44', // Midnight Navy — CTAs invert in light mode
  primarySoft:   '#E8DCC8', // Cream
  primaryDeep:   '#0D1B2A',
  accentGold:    '#C6A75E', // gold stays as luxury accent

  textPrimary:   '#1F2A44',              // navy, NOT pure black (DESIGN.md: softer contrast)
  textSecondary: 'rgba(31,42,68,0.72)',
  textTertiary:  'rgba(31,42,68,0.48)',
  textGold:      '#B48A3C',              // slightly deeper gold for contrast on white
  textOnPrimary: '#FFFFFF',

  success:       '#2F8F5E',
  error:         '#C66A55',
  warning:       '#B48A3C',

  ghostBorder:   'rgba(31,42,68,0.15)',

  shadowColor:   '#1F2A44',
  shadowOpacity: 0.08,
  shadowRadius:  40,
};

/**
 * Radii scale — DESIGN.md mandates "lg" roundedness (≈16) for primary CTAs.
 * "pill" for chips and avatar frames.
 */
export const RADII = {
  none: 0,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  pill: 999,
} as const;

/**
 * Spacing scale — DESIGN.md warns against strict 8px grid. Use "balanced gaps".
 * These are tuned for editorial whitespace, not density.
 */
export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  xxxl: 48,
  huge: 64,
} as const;

/**
 * Font family names — must match names loaded in useEditorialFonts.ts.
 * Inter is used throughout — display, heading, body, and label.
 */
export const FONTS = {
  display:       'Inter_600SemiBold',
  displayItalic: 'Inter_600SemiBold',
  heading:       'Inter_600SemiBold',
  headingItalic: 'Inter_600SemiBold',
  body:          'Inter_400Regular',
  bodyMedium:    'Inter_500Medium',
  label:         'Inter_600SemiBold',
  labelBold:     'Inter_700Bold',
} as const;

/**
 * Typography scale — tied to FONTS + size/lineheight pairs.
 * Keys map loosely to Material 3 + DESIGN.md recommendations.
 */
export const TYPE_SCALE = {
  displayLg: { fontFamily: FONTS.display, fontSize: 48, lineHeight: 56, letterSpacing: -1.0 },
  displayMd: { fontFamily: FONTS.display, fontSize: 36, lineHeight: 44, letterSpacing: -0.8 },
  displaySm: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 36, letterSpacing: -0.6 },
  headlineLg:{ fontFamily: FONTS.heading, fontSize: 24, lineHeight: 32, letterSpacing: -0.4 },
  headlineMd:{ fontFamily: FONTS.heading, fontSize: 20, lineHeight: 28, letterSpacing: -0.3 },
  titleLg:   { fontFamily: FONTS.bodyMedium, fontSize: 18, lineHeight: 26, letterSpacing: 0 },
  titleMd:   { fontFamily: FONTS.bodyMedium, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  body:      { fontFamily: FONTS.body, fontSize: 15, lineHeight: 23, letterSpacing: 0 },
  bodySm:    { fontFamily: FONTS.body, fontSize: 13, lineHeight: 20, letterSpacing: 0 },
  label:     { fontFamily: FONTS.label, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  labelSm:   { fontFamily: FONTS.label, fontSize: 10, lineHeight: 14, letterSpacing: 1.8, textTransform: 'uppercase' as const },
} as const;

/**
 * Ambient shadow preset (per DESIGN.md: blur 30–50px, spread -5px).
 * Usage: `...ambientShadow(theme)` to spread into a StyleSheet block.
 */
export function ambientShadow(tokens: EditorialTokens) {
  return {
    shadowColor: tokens.shadowColor,
    shadowOpacity: tokens.shadowOpacity,
    shadowRadius: tokens.shadowRadius,
    shadowOffset: { width: 0, height: 12 },
    // Android fallback
    elevation: 6,
  };
}

/**
 * Primary gradient colors (135° fill, primary → primaryDeep).
 * Returns as `readonly [string, string]` for expo-linear-gradient.
 */
export function primaryGradient(tokens: EditorialTokens): readonly [string, string] {
  return [tokens.primary, tokens.primaryDeep];
}

export type EditorialTheme = EditorialTokens;
