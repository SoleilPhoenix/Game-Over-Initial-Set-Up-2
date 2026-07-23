/**
 * GlassPanel Component
 * Glassmorphic container with icon circle header
 * Used throughout the event creation wizard
 */

import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { IconCircle } from './IconCircle';

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
      backgroundColor="#1A2F47"
      borderRadius="$lg"
      borderWidth={1}
      borderColor="rgba(230,220,200,0.15)"
      padding="$5"
      marginBottom="$5"
      testID={testID}
    >
      {/* Header with Icon */}
      <XStack alignItems="center" gap="$3" marginBottom="$5">
        <IconCircle
          name={icon}
          color="#C6A75E"
          backgroundColor="rgba(198,167,94,0.15)"
        />
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
