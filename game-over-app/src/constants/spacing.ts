/**
 * Game-Over App Spacing Scale
 * Based on 8px base unit
 */

export const spacing = {
  // Base unit: 8px
  xxs: 4,   // Tight spacing, inline elements
  xs: 8,    // Related elements
  sm: 12,   // Form field vertical spacing
  md: 16,   // Card padding, section spacing
  lg: 24,   // Component separation
  xl: 32,   // Major section breaks
  xxl: 48,  // Page-level spacing
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,   // Standard for buttons, inputs
  lg: 16,   // Large cards
  xl: 24,
  full: 9999,
} as const;

export const touchTarget = {
  minimum: 44,     // iOS minimum
  recommended: 48, // Android minimum
  large: 56,       // Primary actions
} as const;

export const layout = {
  // Screen padding
  screenPaddingHorizontal: spacing.md,
  screenPaddingVertical: spacing.lg,

  // Card dimensions
  cardPadding: spacing.md,
  cardBorderRadius: borderRadius.lg,
  cardSpacing: spacing.md,

  // Input dimensions
  inputHeight: 56,
  inputBorderRadius: borderRadius.md,

  // Button dimensions
  buttonHeight: 56,
  buttonBorderRadius: borderRadius.md,

  // Bottom navigation
  bottomNavHeight: 84,
  fabSize: 56,
} as const;

export const shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.19,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
  },
  primary: {
    shadowColor: '#258CF4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
