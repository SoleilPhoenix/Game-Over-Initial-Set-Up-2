/**
 * GoldDivider — 2px gold underline used beneath editorial headings
 * (e.g. "Key Details" block from Mockup 0).
 */

import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface GoldDividerProps {
  width?: number;
  thickness?: number;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<ViewStyle>;
}

export function GoldDivider({
  width = 40,
  thickness = 2,
  align = 'left',
  style,
}: GoldDividerProps) {
  const { theme } = useTheme();

  const alignSelf =
    align === 'center' ? 'center' :
    align === 'right' ? 'flex-end' :
    'flex-start';

  return (
    <View
      style={[
        {
          width,
          height: thickness,
          backgroundColor: theme.accentGold,
          alignSelf,
          borderRadius: thickness,
        },
        style,
      ]}
    />
  );
}
