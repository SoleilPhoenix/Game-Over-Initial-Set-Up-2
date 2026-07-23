import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { EDITORIAL_DARK, FONTS, RADII, SPACING } from '@/constants/designSystem';

export interface EmptyStateProps {
  title: string;
  subtitle: string;
  preview?: React.ReactNode;
  previewLabel?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  extra?: React.ReactNode;
}

export function EmptyState({
  title,
  subtitle,
  preview,
  previewLabel,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  extra,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      </View>

      {preview ? (
        <View
          style={[
            styles.previewWrapper,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: 'rgba(198,167,94,0.4)',
            },
          ]}
        >
          {previewLabel ? (
            <View style={[styles.previewLabelChip, { backgroundColor: theme.background }]}>
              <Text style={[styles.previewLabel, { color: theme.textGold }]}>
                {previewLabel}
              </Text>
            </View>
          ) : null}
          <View style={styles.previewContent}>{preview}</View>
        </View>
      ) : null}

      {extra ? <View style={styles.extra}>{extra}</View> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onPrimary}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.accentGold },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryLabel}>{primaryLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color={EDITORIAL_DARK.background} />
        </Pressable>

        {secondaryLabel && onSecondary ? (
          <Pressable
            accessibilityRole="button"
            onPress={onSecondary}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: 'rgba(198,167,94,0.5)' },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.secondaryLabel, { color: theme.textGold }]}>
              {secondaryLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  copy: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    maxWidth: 340,
    fontFamily: FONTS.labelBold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 300,
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  previewWrapper: {
    width: '100%',
    minHeight: 116,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RADII.lg,
    padding: SPACING.md,
  },
  previewContent: {
    opacity: 0.72,
  },
  previewLabelChip: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: RADII.pill,
    zIndex: 1,
  },
  previewLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  extra: {
    width: '100%',
    paddingHorizontal: SPACING.xs,
  },
  actions: {
    width: '100%',
    gap: SPACING.sm,
  },
  primaryButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  primaryLabel: {
    color: EDITORIAL_DARK.background,
    fontFamily: FONTS.labelBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 46,
    borderRadius: RADII.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  secondaryLabel: {
    fontFamily: FONTS.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
