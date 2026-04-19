/**
 * MinimalInput — bottom-bar underline input, no bounding box.
 * Focus state = gold glow underline per DESIGN.md.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { SPACING, TYPE_SCALE } from '@/constants/designSystem';

export interface MinimalInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightAdornment?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function MinimalInput({
  label,
  error,
  hint,
  rightAdornment,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: MinimalInputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const underlineColor =
    error ? theme.error :
    focused ? theme.accentGold :
    theme.ghostBorder;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[TYPE_SCALE.label, { color: theme.textTertiary, marginBottom: SPACING.xs }]}>
          {label}
        </Text>
      ) : null}

      <View style={styles.row}>
        <TextInput
          {...inputProps}
          placeholderTextColor={theme.textTertiary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            TYPE_SCALE.body,
            styles.input,
            { color: theme.textPrimary },
            style,
          ]}
        />
        {rightAdornment ? <View style={styles.adornment}>{rightAdornment}</View> : null}
      </View>

      <View style={[styles.underline, { backgroundColor: underlineColor }]} />

      {error ? (
        <Text style={[TYPE_SCALE.bodySm, { color: theme.error, marginTop: SPACING.xs }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[TYPE_SCALE.bodySm, { color: theme.textTertiary, marginTop: SPACING.xs }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.sm,
  },
  adornment: {
    marginLeft: SPACING.sm,
  },
  underline: {
    height: StyleSheet.hairlineWidth * 2,
    width: '100%',
  },
});
