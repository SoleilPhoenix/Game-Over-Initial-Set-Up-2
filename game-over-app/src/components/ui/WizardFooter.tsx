/**
 * WizardFooter Component
 * Consistent footer for wizard steps: square back button + primary action button
 * Matches mockup design pattern across all wizard steps
 */

import React from 'react';
import { XStack, YStack } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';

export interface WizardFooterProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  /** Optional secondary button (e.g., "Skip") rendered between back and next */
  secondaryLabel?: string;
  onSecondary?: () => void;
  showBack?: boolean;
  testIDPrefix?: string;
}

export function WizardFooter({
  onBack,
  onNext,
  nextLabel = 'Next Step',
  nextDisabled = false,
  nextLoading = false,
  secondaryLabel,
  onSecondary,
  showBack = true,
  testIDPrefix = 'wizard',
}: WizardFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <XStack
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      padding="$4"
      paddingBottom={insets.bottom + 16}
      backgroundColor="$surface"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      gap="$3"
      alignItems="center"
    >
      {showBack && onBack && (
        <YStack
          width={48}
          height={48}
          borderRadius="$lg"
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.15)"
          backgroundColor="rgba(45, 55, 72, 0.4)"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.7, scale: 0.95 }}
          onPress={onBack}
          testID={`${testIDPrefix}-back-button`}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </YStack>
      )}
      {secondaryLabel && onSecondary && (
        <Button
          flex={1}
          variant="outline"
          onPress={onSecondary}
          testID={`${testIDPrefix}-secondary-button`}
        >
          {secondaryLabel}
        </Button>
      )}
      <Button
        flex={1}
        onPress={onNext}
        disabled={nextDisabled}
        loading={nextLoading}
        testID={`${testIDPrefix}-next-button`}
      >
        {nextLabel}
      </Button>
    </XStack>
  );
}

export default WizardFooter;
