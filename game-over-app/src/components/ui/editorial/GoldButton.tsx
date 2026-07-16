/**
 * GoldButton — primary CTA with 135° gradient (primary → primaryDeep).
 * Pill shape per DESIGN.md. Secondary variant = ghost-bordered outline.
 */

import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { RADII, SPACING, TYPE_SCALE, primaryGradient } from '@/constants/designSystem';

export type GoldButtonVariant = 'primary' | 'secondary' | 'ghost';
export type GoldButtonSize = 'sm' | 'md' | 'lg';

export interface GoldButtonProps {
  label: string;
  onPress?: () => void;
  variant?: GoldButtonVariant;
  size?: GoldButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const SIZE_MAP: Record<GoldButtonSize, { padV: number; padH: number }> = {
  sm: { padV: SPACING.sm, padH: SPACING.lg },
  md: { padV: SPACING.md, padH: SPACING.xl },
  lg: { padV: SPACING.lg, padH: SPACING.xxl },
};

export function GoldButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  testID,
  style,
}: GoldButtonProps) {
  const { theme } = useTheme();
  const { padV, padH } = SIZE_MAP[size];
  const isDisabled = disabled || loading;

  const contentColor =
    variant === 'primary' ? theme.textOnPrimary :
    variant === 'secondary' ? theme.textPrimary :
    theme.textGold;

  const content = (
    <View style={[styles.row, { paddingVertical: padV, paddingHorizontal: padH }]}>
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          <Text
            style={[
              TYPE_SCALE.titleMd,
              { color: contentColor, fontFamily: TYPE_SCALE.titleMd.fontFamily },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {label}
          </Text>
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </>
      )}
    </View>
  );

  const containerBase: ViewStyle = {
    borderRadius: RADII.pill,
    overflow: 'hidden',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: isDisabled ? 0.5 : 1,
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        containerBase,
        { transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }] },
        variant === 'secondary' && {
          backgroundColor: theme.surfaceCard,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.ghostBorder,
        },
        variant === 'ghost' && {
          backgroundColor: 'transparent',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.accentGold,
        },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={primaryGradient(theme)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: SPACING.sm,
  },
  iconRight: {
    marginLeft: SPACING.sm,
  },
});
