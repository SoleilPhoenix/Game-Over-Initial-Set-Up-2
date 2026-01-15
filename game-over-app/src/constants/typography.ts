/**
 * Game-Over App Typography Scale
 * Based on PRD Design Specifications
 */

export const typography = {
  // Font Family
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
  },

  // Font Sizes (Mobile-first)
  fontSize: {
    heading1: 32,
    heading2: 24,
    heading3: 20,
    bodyLarge: 18,
    body: 16,
    bodySmall: 14,
    caption: 12,
  },

  // Line Heights
  lineHeight: {
    heading: 1.2,
    body: 1.5,
    caption: 1.4,
  },

  // Letter Spacing
  letterSpacing: {
    heading1: -0.5,
    heading2: -0.25,
    heading3: 0,
    body: 0,
    button: 0.5,
    caption: 0.5,
  },

  // Responsive Scaling (Tablet/Desktop)
  responsive: {
    heading1: 48,
    heading2: 32,
    heading3: 24,
    body: 18,
    scaleFactor: 1.25,
  },
} as const;

// Pre-defined text styles
export const textStyles = {
  h1: {
    fontSize: typography.fontSize.heading1,
    fontWeight: '700' as const,
    letterSpacing: typography.letterSpacing.heading1,
    lineHeight: typography.fontSize.heading1 * typography.lineHeight.heading,
  },
  h2: {
    fontSize: typography.fontSize.heading2,
    fontWeight: '700' as const,
    letterSpacing: typography.letterSpacing.heading2,
    lineHeight: typography.fontSize.heading2 * typography.lineHeight.heading,
  },
  h3: {
    fontSize: typography.fontSize.heading3,
    fontWeight: '600' as const,
    letterSpacing: typography.letterSpacing.heading3,
    lineHeight: typography.fontSize.heading3 * typography.lineHeight.heading,
  },
  bodyLarge: {
    fontSize: typography.fontSize.bodyLarge,
    fontWeight: '400' as const,
    letterSpacing: typography.letterSpacing.body,
    lineHeight: typography.fontSize.bodyLarge * typography.lineHeight.body,
  },
  body: {
    fontSize: typography.fontSize.body,
    fontWeight: '400' as const,
    letterSpacing: typography.letterSpacing.body,
    lineHeight: typography.fontSize.body * typography.lineHeight.body,
  },
  bodySmall: {
    fontSize: typography.fontSize.bodySmall,
    fontWeight: '500' as const,
    letterSpacing: typography.letterSpacing.body,
    lineHeight: typography.fontSize.bodySmall * typography.lineHeight.body,
  },
  caption: {
    fontSize: typography.fontSize.caption,
    fontWeight: '500' as const,
    letterSpacing: typography.letterSpacing.caption,
    lineHeight: typography.fontSize.caption * typography.lineHeight.caption,
  },
  button: {
    fontSize: typography.fontSize.body,
    fontWeight: '700' as const,
    letterSpacing: typography.letterSpacing.button,
    textTransform: 'uppercase' as const,
  },
  buttonSmall: {
    fontSize: typography.fontSize.bodySmall,
    fontWeight: '600' as const,
    letterSpacing: typography.letterSpacing.body,
  },
} as const;
