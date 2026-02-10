/**
 * GlassPanel Component
 * Glassmorphic container with icon circle header
 * Used throughout the event creation wizard
 */

import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { DARK_THEME } from '@/constants/theme';

export interface GlassPanelProps {
  icon: string;
  title: string;
  rightElement?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}

export function GlassPanel({
  icon,
  title,
  rightElement,
  children,
  testID,
}: GlassPanelProps) {
  return (
    <YStack
      backgroundColor="rgba(45, 55, 72, 0.4)"
      borderRadius="$lg"
      borderWidth={1}
      borderColor="rgba(255, 255, 255, 0.08)"
      padding="$5"
      marginBottom="$5"
      testID={testID}
    >
      {/* Header with Icon */}
      <XStack alignItems="center" gap="$3" marginBottom="$5">
        <YStack
          width={32}
          height={32}
          borderRadius="$full"
          backgroundColor="rgba(37, 140, 244, 0.2)"
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons name={icon as any} size={18} color={DARK_THEME.primary} />
        </YStack>
        <Text fontSize="$4" fontWeight="600" color="$textPrimary" flex={1}>
          {title}
        </Text>
        {rightElement}
      </XStack>
      {children}
    </YStack>
  );
}

export default GlassPanel;
