/**
 * SectionLabel — small-caps eyebrow label used above section headings.
 * E.g. "ORGANISING", "STATUS", "PACKAGE".
 */

import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { TYPE_SCALE } from '@/constants/designSystem';

export interface SectionLabelProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'gold' | 'muted';
  size?: 'sm' | 'md';
  style?: StyleProp<TextStyle>;
}

export function SectionLabel({
  children,
  tone = 'gold',
  size = 'md',
  style,
}: SectionLabelProps) {
  const { theme } = useTheme();

  const color =
    tone === 'gold' ? theme.textGold :
    tone === 'muted' ? theme.textTertiary :
    theme.textSecondary;

  const preset = size === 'sm' ? TYPE_SCALE.labelSm : TYPE_SCALE.label;

  return (
    <Text style={[preset, { color }, style]}>
      {children}
    </Text>
  );
}
