/**
 * GoldChip — tag / status badge in editorial style.
 * Pill-shaped with `surfaceHigh` BG and optional gold-text variant.
 */

import React from 'react';
import { Pressable, View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { RADII, SPACING, TYPE_SCALE } from '@/constants/designSystem';

export type GoldChipTone = 'neutral' | 'gold' | 'solid';

export interface GoldChipProps {
  label: string;
  tone?: GoldChipTone;
  selected?: boolean;
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function GoldChip({
  label,
  tone = 'neutral',
  selected = false,
  onPress,
  leftIcon,
  testID,
  style,
}: GoldChipProps) {
  const { theme } = useTheme();

  const backgroundColor =
    tone === 'solid' || selected ? theme.primary :
    tone === 'gold' ? 'transparent' :
    theme.surfaceHigh;

  const textColor =
    tone === 'solid' || selected ? theme.textOnPrimary :
    tone === 'gold' ? theme.textGold :
    theme.textPrimary;

  const borderColor =
    tone === 'gold' || selected ? theme.accentGold : theme.ghostBorder;

  const Container: any = onPress ? Pressable : View;

  return (
    <Container
      testID={testID}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
      <Text style={[TYPE_SCALE.label, { color: textColor }]}>{label}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    marginRight: SPACING.xs + 2,
  },
});
