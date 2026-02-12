/**
 * OptionBlock Component
 * Full-width selectable pill for wizard questions.
 * Matches the bachelor/bachelorette selection style in Step 1.
 */

import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { DARK_THEME } from '@/constants/theme';

export interface OptionBlockProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export function OptionBlock({ label, selected, onPress, testID }: OptionBlockProps) {
  return (
    <XStack
      height={48}
      borderRadius="$full"
      backgroundColor={selected ? DARK_THEME.primary : 'rgba(45, 55, 72, 0.6)'}
      borderWidth={1}
      borderColor={selected ? DARK_THEME.primary : 'rgba(255, 255, 255, 0.08)'}
      alignItems="center"
      justifyContent="center"
      gap="$2"
      pressStyle={{ opacity: 0.8, scale: 0.98 }}
      onPress={onPress}
      testID={testID}
    >
      <Text fontWeight="600" color={selected ? '#FFFFFF' : '$textPrimary'}>
        {label}
      </Text>
      {selected && (
        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
      )}
    </XStack>
  );
}

export interface OptionBlockGroupProps {
  children: React.ReactNode;
  testID?: string;
}

export function OptionBlockGroup({ children, testID }: OptionBlockGroupProps) {
  return (
    <YStack gap="$3" testID={testID}>
      {children}
    </YStack>
  );
}

export default OptionBlock;
