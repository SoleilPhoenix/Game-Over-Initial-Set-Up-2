import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING } from '@/constants/designSystem';

export const FLOATING_FEEDBACK_MAX_WIDTH = 420;
export const FLOATING_FEEDBACK_MIN_HEIGHT = 80;
export const FLOATING_FEEDBACK_EDGE_GAP = SPACING.sm;

export function useFloatingFeedbackBottomSpacing(): number {
  const insets = useSafeAreaInsets();

  // The Home Indicator occupies the area below this inset; placing the card
  // there would clip it. This is the lowest safe position, not extra spacing.
  return Math.max(insets.bottom, FLOATING_FEEDBACK_EDGE_GAP);
}
