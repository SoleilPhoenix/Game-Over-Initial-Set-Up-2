/**
 * SerifHeading — Fraunces editorial display type.
 * Consumes TYPE_SCALE presets so sizes stay consistent across screens.
 */

import React from 'react';
import { Text, TextProps, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { TYPE_SCALE, FONTS } from '@/constants/designSystem';

export type SerifVariant =
  | 'displayLg'
  | 'displayMd'
  | 'displaySm'
  | 'headlineLg'
  | 'headlineMd';

export interface SerifHeadingProps extends TextProps {
  variant?: SerifVariant;
  italic?: boolean;
  color?: 'primary' | 'secondary' | 'gold' | 'inherit';
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
}

export function SerifHeading({
  variant = 'displayMd',
  italic = false,
  color = 'primary',
  align = 'left',
  style,
  children,
  ...rest
}: SerifHeadingProps) {
  const { theme } = useTheme();

  const textColor =
    color === 'secondary' ? theme.textSecondary :
    color === 'gold' ? theme.textGold :
    color === 'inherit' ? undefined :
    theme.textPrimary;

  const preset = TYPE_SCALE[variant];
  const fontFamily = italic
    ? (variant.startsWith('display') ? FONTS.displayItalic : FONTS.headingItalic)
    : preset.fontFamily;

  return (
    <Text
      {...rest}
      allowFontScaling
      style={[
        preset,
        { fontFamily, color: textColor, textAlign: align },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
