/**
 * GoldIconBadge — circular avatar/icon slot with gold ring.
 * Used for section markers, organiser avatars, and icon-led list rows.
 */

import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface GoldIconBadgeProps {
  size?: number;
  ringWidth?: number;
  filled?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GoldIconBadge({
  size = 48,
  ringWidth = 1.5,
  filled = false,
  children,
  style,
}: GoldIconBadgeProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: theme.accentGold,
          backgroundColor: filled ? theme.surfaceHigh : 'transparent',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
