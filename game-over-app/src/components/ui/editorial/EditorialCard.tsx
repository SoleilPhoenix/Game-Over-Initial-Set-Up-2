/**
 * EditorialCard — surface primitive with ghost-border + ambient shadow.
 * Replaces "glass" look with solid paper-like surfaces per DESIGN.md.
 */

import React from 'react';
import { View, ViewProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { RADII, SPACING, ambientShadow } from '@/constants/designSystem';

export interface EditorialCardProps extends ViewProps {
  /** Which surface token to use. Defaults to `surfaceCard`. */
  tone?: 'low' | 'card' | 'high' | 'bright';
  /** Show 1px ghost border (15% opacity). Default true. */
  bordered?: boolean;
  /** Apply ambient shadow. Default true. */
  elevated?: boolean;
  /** Padding preset. Default `lg`. */
  padding?: keyof typeof SPACING | 'none';
  /** Corner radius preset. Default `lg`. */
  radius?: keyof typeof RADII;
  style?: StyleProp<ViewStyle>;
}

export function EditorialCard({
  tone = 'card',
  bordered = true,
  elevated = true,
  padding = 'lg',
  radius = 'lg',
  style,
  children,
  ...rest
}: EditorialCardProps) {
  const { theme } = useTheme();

  const backgroundColor =
    tone === 'low' ? theme.surfaceLow :
    tone === 'high' ? theme.surfaceHigh :
    tone === 'bright' ? theme.surfaceBright :
    theme.surfaceCard;

  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          backgroundColor,
          borderRadius: RADII[radius],
          padding: padding === 'none' ? 0 : SPACING[padding],
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.ghostBorder,
        },
        elevated && ambientShadow(theme),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
